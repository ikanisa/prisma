import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { OpenAIEmbeddings } from "https://esm.sh/openai@4.104.0/embeddings-edge";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async () => {
  // Fetch unvectorized documents
  const { data: docs } = await supabase
    .from('documents')
    .select('id, content')
    .is('embedding', null)
    .limit(50);
  if (!docs?.length) {
    return new Response('No docs to vectorize', { status: 200 });
  }
  const embeddings = new OpenAIEmbeddings();
  for (const doc of docs) {
    try {
      const vector = await embeddings.embed([{ text: doc.content }]);
      await supabase.from('agent_document_embeddings').insert({
        document_id: doc.id,
        embedding: vector[0],
      });
      await supabase.from('documents').update({ embedding: true }).eq('id', doc.id);
    } catch (e) {
      console.error('Error vectorizing doc', doc.id, e);
    }
  }
  return new Response('Vectorization complete', { status: 200 });
});
