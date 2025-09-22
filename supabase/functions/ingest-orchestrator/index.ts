import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { module_id } = await req.json()

    if (!module_id) {
      throw new Error('module_id is required')
    }

    console.log(`Orchestrating ingestion for module: ${module_id}`)

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get module details
    const { data: module, error: moduleError } = await supabase
      .from('learning_modules')
      .select('*')
      .eq('id', module_id)
      .single()

    if (moduleError || !module) {
      throw new Error(`Module not found: ${moduleError?.message}`)
    }

    // Get pending pipeline stages
    const { data: pendingStages, error: stagesError } = await supabase
      .from('ingestion_pipeline')
      .select('*')
      .eq('module_id', module_id)
      .eq('status', 'pending')
      .order('stage')

    if (stagesError) {
      throw new Error(`Failed to get pipeline stages: ${stagesError.message}`)
    }

    const results = []

    // Process each pending stage in sequence
    for (const stage of pendingStages || []) {
      try {
        // Update stage to running
        await supabase
          .from('ingestion_pipeline')
          .update({ 
            status: 'running',
            started_at: new Date().toISOString()
          })
          .eq('id', stage.id)

        // Invoke the appropriate function
        const functionName = `ingest-${stage.stage}`
        console.log(`Invoking ${functionName} for module ${module_id}`)
        
        const { data: stageResult, error: stageError } = await supabase.functions.invoke(functionName, {
          body: { module_id }
        })

        if (stageError) {
          // Mark stage as failed
          await supabase
            .from('ingestion_pipeline')
            .update({ 
              status: 'failed',
              completed_at: new Date().toISOString(),
              log: stageError.message
            })
            .eq('id', stage.id)

          results.push({
            stage: stage.stage,
            status: 'failed',
            error: stageError.message
          })
          
          // Stop processing on failure
          break
        } else {
          // Mark stage as completed
          await supabase
            .from('ingestion_pipeline')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              log: 'Stage completed successfully'
            })
            .eq('id', stage.id)

          results.push({
            stage: stage.stage,
            status: 'completed',
            result: stageResult
          })
        }

        // Small delay between stages
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Error in stage ${stage.stage}:`, error)
        
        await supabase
          .from('ingestion_pipeline')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString(),
            log: error.message
          })
          .eq('id', stage.id)

        results.push({
          stage: stage.stage,
          status: 'failed',
          error: error.message
        })
        break
      }
    }

    // Check if all stages completed successfully
    const { data: allStages } = await supabase
      .from('ingestion_pipeline')
      .select('status')
      .eq('module_id', module_id)

    const allCompleted = allStages?.every(s => s.status === 'completed')
    const hasFailed = allStages?.some(s => s.status === 'failed')

    // Update module status
    let finalStatus = module.status
    if (hasFailed) {
      finalStatus = 'failed'
    } else if (allCompleted) {
      finalStatus = 'needs_review'
    } else {
      finalStatus = 'processing'
    }

    await supabase
      .from('learning_modules')
      .update({ status: finalStatus })
      .eq('id', module_id)

    return new Response(
      JSON.stringify({
        success: true,
        module_id,
        final_status: finalStatus,
        stages_processed: results.length,
        stage_results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ingest-orchestrator:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})