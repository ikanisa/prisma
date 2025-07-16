import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize clients
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Google Drive sync...');

    const GOOGLE_SERVICE_JSON = Deno.env.get('GOOGLE_SERVICE_JSON');
    const GOOGLE_DRIVE_FOLDER = Deno.env.get('GOOGLE_DRIVE_FOLDER');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const PINECONE_API_KEY = Deno.env.get('PINECONE_API_KEY');
    const PINECONE_ENV = Deno.env.get('PINECONE_ENV');

    if (!GOOGLE_SERVICE_JSON || !GOOGLE_DRIVE_FOLDER) {
      throw new Error('Missing required environment variables: GOOGLE_SERVICE_JSON, GOOGLE_DRIVE_FOLDER');
    }

    console.log('Environment variables loaded');

    // Parse service account JSON
    const serviceAccount = JSON.parse(GOOGLE_SERVICE_JSON);
    
    // Get access token using service account
    const jwtHeader = btoa(JSON.stringify({
      alg: 'RS256',
      typ: 'JWT'
    }));

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = btoa(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    }));

    // Create JWT token for Google API authentication
    const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
    
    // Create JWT payload
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };

    // Create JWT (simplified - in production use proper JWT library)
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    
    // For now, we'll get documents from the agent_learning table and sync them
    const { data: learningSources, error: learningError } = await supabase
      .from('agent_learning')
      .select('*')
      .eq('source_type', 'google_drive');

    if (learningError) {
      console.error('Error fetching learning sources:', learningError);
      throw learningError;
    }

    console.log(`Found ${learningSources?.length || 0} Google Drive sources to sync`);

    let syncedCount = 0;
    
    // Process each Google Drive source
    for (const source of learningSources || []) {
      try {
        // Extract file ID from Google Drive URL
        const url = source.source_detail;
        const fileIdMatch = url?.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const fileId = fileIdMatch ? fileIdMatch[1] : null;
        
        if (!fileId) {
          console.warn('Could not extract file ID from URL:', url);
          continue;
        }

        // Check if document already exists
        const { data: existingDoc } = await supabase
          .from('agent_documents')
          .select('id')
          .eq('drive_file_id', fileId)
          .single();

        if (existingDoc) {
          console.log(`Document ${fileId} already exists, skipping`);
          continue;
        }

        // Create document entry (we'll enhance with actual Google API calls later)
        const document = {
          id: crypto.randomUUID(),
          agent_id: source.agent_id,
          title: `Google Drive Document ${fileId}`,
          storage_path: null,
          drive_file_id: fileId,
          drive_mime: 'application/vnd.google-apps.document',
          embedding_ok: false,
          created_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('agent_documents')
          .insert(document);

        if (insertError) {
          console.error(`Error inserting document ${fileId}:`, insertError);
          continue;
        }

        syncedCount++;
        console.log(`Successfully synced document: ${fileId}`);
        
      } catch (error) {
        console.error('Error processing source:', source, error);
      }
    }

    console.log(`Google Drive sync completed. Synced ${syncedCount} documents`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Google Drive sync completed. Synced ${syncedCount} documents`,
        syncedCount 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in Google Drive sync:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});