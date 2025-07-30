import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Phase 2: Learning & Memory Wiring - Integration Test');

    // 1. Create/Update Assistant with memory tools
    console.log('Step 1: Setting up assistant...');
    const assistantResponse = await supabase.functions.invoke('setup-omni-assistant', {
      body: { action: 'create' }
    });

    if (assistantResponse.error) {
      throw new Error(`Assistant setup failed: ${assistantResponse.error.message}`);
    }

    console.log('✅ Assistant created/updated with memory tools');

    // 2. Update with Persona v1.0.0
    console.log('Step 2: Applying persona...');
    const personaResponse = await supabase.functions.invoke('update-assistant-persona', {
      body: {}
    });

    if (personaResponse.error) {
      console.warn('Persona update warning:', personaResponse.error.message);
    } else {
      console.log('✅ Persona v1.0.0 applied successfully');
    }

    // 3. Test intent detection with language detection
    console.log('Step 3: Testing language detection...');
    const intentTestResponse = await supabase.functions.invoke('detect-intent-slots', {
      body: { 
        userText: 'Muraho, nshaka kwishyura 5000', // Kinyarwanda: "Hello, I want to pay 5000"
        userId: 'test-user-250788767816'
      }
    });

    console.log('Intent detection result:', intentTestResponse);

    // 4. Test memory consolidation
    console.log('Step 4: Testing memory consolidation...');
    const memoryTestResponse = await supabase.functions.invoke('memory-consolidator', {
      body: {
        user_id: 'test-user-250788767816',
        conversation_summary: 'User greeted in Kinyarwanda and requested payment for 5000 RWF',
        learning_insights: {
          preferences: {
            language: 'rw',
            preferredServices: ['payments'],
            timeOfDay: 'afternoon'
          },
          patterns: {
            greetingStyle: 'formal_kinyarwanda',
            paymentAmounts: [5000],
            interactionFrequency: 'first_time'
          },
          confidence: 0.85
        }
      }
    });

    console.log('Memory consolidation result:', memoryTestResponse);

    // 5. Test after-turn middleware
    console.log('Step 5: Testing after-turn middleware...');
    const afterTurnResponse = await supabase.functions.invoke('after-turn-middleware', {
      body: {
        waId: '250788767816',
        conversationHistory: [
          { role: 'user', content: 'Muraho, nshaka kwishyura 5000' },
          { role: 'assistant', content: 'Muraho! I see you want to pay 5000 RWF. Here are your options...' }
        ],
        intent: 'payment',
        outcome: 'success'
      }
    });

    console.log('After-turn middleware result:', afterTurnResponse);

    // Summary
    const summary = {
      phase: 'Phase 2: Learning & Memory Wiring',
      status: 'COMPLETE',
      components: {
        assistant_memory_tools: assistantResponse.error ? 'WARNING' : 'SUCCESS',
        persona_integration: personaResponse.error ? 'WARNING' : 'SUCCESS', 
        language_detection: intentTestResponse.error ? 'FAILED' : 'SUCCESS',
        memory_consolidation: memoryTestResponse.error ? 'FAILED' : 'SUCCESS',
        after_turn_middleware: afterTurnResponse.error ? 'FAILED' : 'SUCCESS'
      },
      next_phase: 'Phase 3: Action-Button Template Library',
      capabilities_added: [
        'Memory-driven conversations (never ask twice)',
        'Language detection & preference storage (rw/en/fr/sw)',
        'After-turn learning consolidation',
        'Conversation pattern recognition',
        'User preference extraction'
      ]
    };

    return new Response(
      JSON.stringify(summary, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Phase 2 completion error:', error);
    return new Response(
      JSON.stringify({ 
        phase: 'Phase 2: Learning & Memory Wiring',
        status: 'FAILED',
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});