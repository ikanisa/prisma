import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOpenAI, generateIntelligentResponse } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, fine_tune_job_id, export_params } = await req.json();

    switch (action) {
      case 'export_training_data':
        return await exportTrainingData(export_params);
      
      case 'start_fine_tune':
        return await startFineTuneJob(export_params);
      
      case 'check_job_status':
        return await checkJobStatus(fine_tune_job_id);
      
      case 'list_models':
        return await listFineTunedModels();
      
      default:
        throw new Error('Invalid action. Use: export_training_data, start_fine_tune, check_job_status, list_models');
    }

  } catch (error) {
    console.error('Fine-tune exporter error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function exportTrainingData(params: any = {}) {
  const {
    min_quality_score = 0.8,
    max_records = 1000,
    include_categories = [],
    export_format = 'openai_chat'
  } = params;

  console.log(`Exporting training data with min quality: ${min_quality_score}`);

  // Get high-quality conversation data
  let query = supabase
    .from('conversation_messages')
    .select(`
      id,
      message_text,
      sender,
      phone_number,
      model_used,
      confidence_score,
      created_at
    `)
    .gte('confidence_score', min_quality_score)
    .order('created_at', { ascending: false })
    .limit(max_records * 2); // Get more to filter pairs

  const { data: messages, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  // Group messages by phone number and create conversation pairs
  const conversationPairs = [];
  const messagesByPhone = new Map();

  // Group by phone number
  messages.forEach(msg => {
    if (!messagesByPhone.has(msg.phone_number)) {
      messagesByPhone.set(msg.phone_number, []);
    }
    messagesByPhone.get(msg.phone_number).push(msg);
  });

  // Extract user-assistant pairs
  for (const [phone, msgs] of messagesByPhone) {
    for (let i = 0; i < msgs.length - 1; i++) {
      const userMsg = msgs[i];
      const assistantMsg = msgs[i + 1];

      // Ensure we have a user -> assistant pair
      if (userMsg.sender === 'user' && assistantMsg.sender === 'assistant') {
        // Skip if too short or too long
        if (userMsg.message_text.length < 10 || userMsg.message_text.length > 500) continue;
        if (assistantMsg.message_text.length < 10 || assistantMsg.message_text.length > 1000) continue;

        conversationPairs.push({
          user_message: userMsg.message_text,
          assistant_message: assistantMsg.message_text,
          quality_score: assistantMsg.confidence_score || 0.8,
          model_used: assistantMsg.model_used || 'gpt-4o',
          phone_number: phone
        });

        if (conversationPairs.length >= max_records) break;
      }
    }
    if (conversationPairs.length >= max_records) break;
  }

  // Format for OpenAI fine-tuning
  let trainingData;
  if (export_format === 'openai_chat') {
    trainingData = conversationPairs.map(pair => ({
      messages: [
        { role: "system", content: "You are a helpful commerce assistant for easyMO in Rwanda. Be concise, friendly, and use Kinyarwanda greetings when appropriate." },
        { role: "user", content: pair.user_message },
        { role: "assistant", content: pair.assistant_message }
      ]
    }));
  } else {
    trainingData = conversationPairs;
  }

  // Store in training_data_export table
  const exportRecords = conversationPairs.map(pair => ({
    user_message: pair.user_message,
    assistant_message: pair.assistant_message,
    quality_score: pair.quality_score,
    status: 'exported'
  }));

  const { error: insertError } = await supabase
    .from('training_data_export')
    .insert(exportRecords);

  if (insertError) {
    console.error('Failed to store export records:', insertError);
  }

  // Convert to JSONL format
  const jsonlData = trainingData
    .map(item => JSON.stringify(item))
    .join('\n');

  return new Response(JSON.stringify({
    success: true,
    total_pairs: conversationPairs.length,
    export_format,
    data_preview: trainingData.slice(0, 3),
    jsonl_size: jsonlData.length,
    jsonl_data: jsonlData
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function startFineTuneJob(params: any = {}) {
  const { base_model = 'gpt-3.5-turbo', model_suffix = 'easymo-v1' } = params;

  console.log(`Starting fine-tune job with base model: ${base_model}`);

  // First export training data
  const exportResponse = await exportTrainingData(params);
  const exportData = JSON.parse(await exportResponse.text());

  if (!exportData.success) {
    throw new Error('Failed to export training data');
  }

  // Create training file
  const trainingFile = new Blob([exportData.jsonl_data], { type: 'application/jsonl' });

  // Upload file to OpenAI
  const fileUpload = await openai.files.create({
    file: trainingFile,
    purpose: 'fine-tune'
  });

  console.log(`Training file uploaded: ${fileUpload.id}`);

  // Start fine-tuning job
  const fineTuneJob = await openai.fineTuning.jobs.create({
    training_file: fileUpload.id,
    model: base_model,
    suffix: model_suffix,
    hyperparameters: {
      n_epochs: 3,
      batch_size: 1,
      learning_rate_multiplier: 0.1
    }
  });

  console.log(`Fine-tune job started: ${fineTuneJob.id}`);

  // Store in model registry
  const { error: registryError } = await supabase
    .from('mcp_model_registry')
    .insert({
      model_name: `${base_model}-${model_suffix}`,
      model_type: 'fine_tuned',
      openai_model_id: fineTuneJob.fine_tuned_model || 'pending',
      fine_tune_job_id: fineTuneJob.id,
      status: 'training',
      performance_metrics: {
        training_file_id: fileUpload.id,
        training_examples: exportData.total_pairs
      }
    });

  if (registryError) {
    console.error('Failed to store in model registry:', registryError);
  }

  // Update training data export records
  await supabase
    .from('training_data_export')
    .update({ fine_tune_job_id: fineTuneJob.id })
    .eq('status', 'exported')
    .is('fine_tune_job_id', null);

  return new Response(JSON.stringify({
    success: true,
    job_id: fineTuneJob.id,
    training_file_id: fileUpload.id,
    base_model,
    suffix: model_suffix,
    training_examples: exportData.total_pairs,
    estimated_completion: new Date(Date.now() + 3600000).toISOString() // ~1 hour estimate
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function checkJobStatus(jobId: string) {
  if (!jobId) {
    throw new Error('job_id is required');
  }

  const job = await openai.fineTuning.jobs.retrieve(jobId);

  // Update model registry if completed
  if (job.status === 'succeeded' && job.fine_tuned_model) {
    await supabase
      .from('mcp_model_registry')
      .update({
        openai_model_id: job.fine_tuned_model,
        status: 'active',
        performance_metrics: {
          ...job,
          completed_at: new Date().toISOString()
        }
      })
      .eq('fine_tune_job_id', jobId);

    console.log(`Fine-tuned model ready: ${job.fine_tuned_model}`);
  }

  return new Response(JSON.stringify({
    success: true,
    job_id: jobId,
    status: job.status,
    fine_tuned_model: job.fine_tuned_model,
    created_at: job.created_at,
    finished_at: job.finished_at,
    training_file: job.training_file,
    result_files: job.result_files
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function listFineTunedModels() {
  const jobs = await openai.fineTuning.jobs.list({ limit: 20 });

  const { data: registryModels } = await supabase
    .from('mcp_model_registry')
    .select('*')
    .eq('model_type', 'fine_tuned')
    .order('created_at', { ascending: false });

  return new Response(JSON.stringify({
    success: true,
    openai_jobs: jobs.data,
    registry_models: registryModels || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}