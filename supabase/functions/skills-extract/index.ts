import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async () => {
  // Recompute confidence for agent_skills
  const { data: skills } = await supabase.from('agent_skills').select('id, example_prompts');
  if (!skills?.length) {
    return new Response('No skills to extract', { status: 200 });
  }
  for (const skill of skills) {
    try {
      // Example: simple scoring by prompt length
      const confidence = Math.min(1, (skill.example_prompts?.length || 0) / 100);
      await supabase.from('agent_skills').update({ confidence }).eq('id', skill.id);
    } catch (e) {
      console.error('Error updating skill confidence', skill.id, e);
    }
  }
  return new Response('Skills confidence refreshed', { status: 200 });
});
