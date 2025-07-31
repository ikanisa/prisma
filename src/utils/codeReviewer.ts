import { supabase } from '@/integrations/supabase/client';

export async function runCodeReview() {
  try {
    console.log('🔍 Starting Phase 3 code review...');
    const { data, error } = await supabase.functions.invoke('multi-ai-code-reviewer', {
      body: {
        action: 'full_review',
        files: [],
        context: 'phase_3_edge_functions_modularization'
      }
    });

    if (error) {
      console.error('❌ Supabase function error:', error);
      throw error;
    }
    
    console.log('✅ Phase 3 code review completed:', data);
    return data;
  } catch (error) {
    console.error('❌ Code review error:', error);
    throw error;
  }
}

// Auto-trigger code review for Phase 3 completion
console.log('🚀 Phase 3: Edge Functions Modularization - Auto-triggering code review...');
runCodeReview().then(result => {
  console.log('📊 Phase 3 review result:', result);
}).catch(error => {
  console.error('⚠️ Phase 3 review failed:', error);
});