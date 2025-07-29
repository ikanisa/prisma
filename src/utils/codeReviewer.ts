import { supabase } from '@/integrations/supabase/client';

export async function runCodeReview() {
  try {
    console.log('Starting multi-AI code review...');
    const { data, error } = await supabase.functions.invoke('multi-ai-code-reviewer', {
      body: {
        action: 'full_review',
        files: []
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw error;
    }
    
    console.log('Code review completed:', data);
    return data;
  } catch (error) {
    console.error('Code review error:', error);
    throw error;
  }
}

// Call the code review automatically
runCodeReview().then(result => {
  console.log('Auto-triggered code review result:', result);
}).catch(error => {
  console.error('Auto-triggered code review failed:', error);
});