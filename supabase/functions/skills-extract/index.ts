import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createChatCompletion } from '../_shared/openai-sdk.ts'

// ---------------------------------------------------------------------------
// skills-extract – Nightly skill extraction from learning modules
// ---------------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestPayload {
  module_id?: string
  max_modules?: number
}

/**
 * Very small helper to try/catch every DB update so that a single failure does
 * not stop the entire batch. This mirrors the approach we already use in
 * vectorize-docs and other nightly jobs.
 */
async function safe<T>(promise: Promise<T>): Promise<[T, null] | [null, any]> {
  try {
    return [await promise, null]
  } catch (err) {
    return [null, err]
  }
}

serve(async (req) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { module_id, max_modules = 5 } = (req.method === 'POST')
      ? (await req.json()) as RequestPayload
      : ({} as RequestPayload)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // ---------------------------------------------------------------------
    // Fetch learning modules that still need skill extraction.
    // ---------------------------------------------------------------------
    let modules: any[] = []

    if (module_id) {
      const { data, error } = await supabase
        .from('learning_modules')
        .select('*')
        .eq('id', module_id)
        .single()

      if (error) throw error
      if (data) modules.push(data)
    } else {
      const { data, error } = await supabase
        .from('learning_modules')
        .select('*')
        .or('skills_extracted.is.false,skills_extracted.is.null')
        .limit(max_modules)

      if (error) throw error
      modules = data ?? []
    }

    if (!modules.length) {
      return new Response(
        JSON.stringify({ message: 'No learning modules pending skill extraction' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    for (const mod of modules) {
      try {
        console.log(`🔍 Extracting skills for module ${mod.id} – ${mod.title}`)

        // -----------------------------------------------------------------
        // Use OpenAI to extract up to 20 skills from the module summary/content
        // -----------------------------------------------------------------
        const systemPrompt = `You are an expert curriculum designer. Extract a concise list (max 20) of skills or knowledge topics that are taught or required in the following text. Return the list as a JSON array of strings with no additional keys.`

        const userPrompt = `TEXT:\n---\n${mod.summary || mod.content || ''}\n---`

        let skills: string[] = []
        try {
          const completion = await createChatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ], {
            model: 'gpt-4o-mini',
            temperature: 0.3,
            max_tokens: 256,
          })

          const raw = completion.choices?.[0]?.message?.content?.trim() || '[]'
          skills = JSON.parse(raw)
          if (!Array.isArray(skills)) throw new Error('Unexpected skills format')
        } catch (err) {
          console.warn('OpenAI call failed or returned bad JSON – falling back to regex extraction', err?.message)
          // Primitive fall-back: pick capitalised words longer than 3 letters
          const fallback = (mod.summary || mod.content || '')
            .match(/\b[A-Z][a-zA-Z]{3,}\b/g)?.slice(0, 20) ?? []
          skills = [...new Set(fallback)]
        }

        // -----------------------------------------------------------------
        // Persist extracted skills
        // -----------------------------------------------------------------
        const [{ error: updateErr }] = await safe(
          supabase
            .from('learning_modules')
            .update({ skills_extracted: true, auto_tags: skills, updated_at: new Date().toISOString() })
            .eq('id', mod.id)
        )

        if (updateErr) console.error('Failed to update learning_module', updateErr)

        processed++
      } catch (err) {
        console.error(`❌ Failed to process module ${mod.id}`, err)
      }
    }

    const result = {
      success: true,
      processed,
      total: modules.length,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('skills-extract error', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

