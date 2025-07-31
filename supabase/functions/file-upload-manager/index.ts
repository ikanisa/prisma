import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, phone_number, file_name, file_type, file_data } = await req.json();

    switch (action) {
      case "upload": {
        // Generate unique file name
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}_${file_name}`;
        const storagePath = `chat-files/${phone_number}/${uniqueFileName}`;

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('chat-files')
          .upload(storagePath, file_data, {
            contentType: file_type,
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabaseClient.storage
          .from('chat-files')
          .getPublicUrl(storagePath);

        // Save file record
        const { data: fileRecord, error: dbError } = await supabaseClient
          .from('file_uploads')
          .insert({
            phone_number,
            file_name,
            file_size: file_data.length,
            file_type,
            file_url: urlData.publicUrl,
            storage_path: storagePath,
            upload_status: 'completed'
          })
          .select()
          .single();

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`);
        }

        return new Response(JSON.stringify({
          success: true,
          file: fileRecord
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "list": {
        const { data: files, error } = await supabaseClient
          .from('file_uploads')
          .select('*')
          .eq('phone_number', phone_number)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          files
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "delete": {
        const { file_id } = await req.json();
        
        // Get file record
        const { data: fileRecord, error: fetchError } = await supabaseClient
          .from('file_uploads')
          .select('storage_path')
          .eq('id', file_id)
          .single();

        if (fetchError) throw fetchError;

        // Delete from storage
        const { error: storageError } = await supabaseClient.storage
          .from('chat-files')
          .remove([fileRecord.storage_path]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }

        // Delete database record
        const { error: dbError } = await supabaseClient
          .from('file_uploads')
          .delete()
          .eq('id', file_id);

        if (dbError) throw dbError;

        return new Response(JSON.stringify({
          success: true,
          message: 'File deleted successfully'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('File upload manager error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});