import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { module_id, decision, notes, reviewer_id } = await req.json()

    if (!module_id || !decision || !reviewer_id) {
      throw new Error('module_id, decision, and reviewer_id are required')
    }

    if (!['approved', 'rejected', 'needs_fix'].includes(decision)) {
      throw new Error('decision must be approved, rejected, or needs_fix')
    }

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

    // Record the review decision
    const { error: reviewError } = await supabase
      .from('module_reviews')
      .insert({
        module_id,
        reviewer_id,
        decision,
        notes,
        decided_at: new Date().toISOString()
      })

    if (reviewError) {
      throw new Error(`Failed to record review: ${reviewError.message}`)
    }

    // Update module status based on decision
    let newStatus = module.status
    if (decision === 'approved') {
      newStatus = 'approved'
    } else if (decision === 'rejected') {
      newStatus = 'failed'
      
      // If rejected, remove vectors from Pinecone
      if (module.vector_count > 0) {
        try {
          await supabase.functions.invoke('pinecone-vector-manager', {
            body: {
              operation: 'delete_by_metadata',
              namespace: module.vector_ns,
              metadata_filter: { module_id }
            }
          })
          console.log(`Removed vectors for rejected module ${module_id}`)
        } catch (error) {
          console.warn('Failed to remove vectors:', error.message)
        }
      }
    } else if (decision === 'needs_fix') {
      newStatus = 'needs_review'
    }

    // Update module status
    const { error: updateError } = await supabase
      .from('learning_modules')
      .update({ status: newStatus })
      .eq('id', module_id)

    if (updateError) {
      throw new Error(`Failed to update module status: ${updateError.message}`)
    }

    // If approved, trigger refresh of agent namespace for immediate availability
    if (decision === 'approved' && module.vector_count > 0) {
      try {
        await supabase.functions.invoke('refresh-namespace', {
          body: { 
            namespace: module.vector_ns,
            agent_id: module.agent_scope
          }
        })
        console.log(`Refreshed namespace ${module.vector_ns} for approved module`)
      } catch (error) {
        console.warn('Failed to refresh namespace:', error.message)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        module_id,
        decision,
        new_status: newStatus,
        reviewer_id,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in module-review:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})