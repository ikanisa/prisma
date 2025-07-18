import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const agentId = formData.get('agent_id') as string;
    const title = formData.get('title') as string;

    if (!file || !agentId) {
      return new Response(
        JSON.stringify({ error: 'File and agent_id are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Uploading file: ${file.name}, Size: ${file.size}, Agent ID: ${agentId}`);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${agentId}/${timestamp}-${file.name}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('persona-docs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('File uploaded successfully:', uploadData);

    // Insert document record into database
    const { data: docData, error: docError } = await supabaseClient
      .from('agent_documents')
      .insert({
        agent_id: agentId,
        title: title || file.name,
        storage_path: fileName,
        drive_mime: file.type,
        embedding_ok: false
      })
      .select()
      .single();

    if (docError) {
      console.error('Database insert error:', docError);
      // Clean up uploaded file if database insert fails
      await supabaseClient.storage.from('persona-docs').remove([fileName]);
      
      return new Response(
        JSON.stringify({ error: 'Failed to save document record', details: docError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Document record created:', docData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        document: docData,
        message: 'Document uploaded successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});