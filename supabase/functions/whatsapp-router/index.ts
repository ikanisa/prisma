// Unified WhatsApp Router - Consolidates all WhatsApp webhook functionality
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment validation
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || Deno.env.get("META_WABA_VERIFY_TOKEN");
const WEBHOOK_SECRET = Deno.env.get("WHATSAPP_SIGNATURE_KEY") || Deno.env.get("META_WABA_WEBHOOK_SECRET");

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing required Supabase environment variables");
}

if (!VERIFY_TOKEN) {
  throw new Error("Missing verify token (WHATSAPP_VERIFY_TOKEN or META_WABA_VERIFY_TOKEN)");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

// Input sanitization
function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.slice(0, 2000).replace(/[<>\"'&]/g, "");
}

// Webhook signature verification
async function verifySignature(body: string, signature: string): Promise<boolean> {
  if (!WEBHOOK_SECRET || !signature) return true; // Skip if not configured

  try {
    const sigBuffer = new TextEncoder().encode(signature.replace("sha256=", ""));
    const bodyBuffer = new TextEncoder().encode(body);
    const keyBuffer = new TextEncoder().encode(WEBHOOK_SECRET);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const expectedSig = await crypto.subtle.sign("HMAC", cryptoKey, bodyBuffer);
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    
    return signature === `sha256=${expectedHex}`;
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

// Rate limiting check (10-second per-sender limit)
async function checkRateLimit(phoneNumber: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    const { data: lastLog, error } = await supabase
      .from("whatsapp_logs")
      .select("received_at")
      .eq("phone_number", phoneNumber)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Rate limit check error:", error);
      return { allowed: true }; // Allow on error
    }

    if (lastLog) {
      const lastTime = new Date(lastLog.received_at).getTime();
      const now = Date.now();
      const timeDiff = now - lastTime;
      
      if (timeDiff < 10000) { // 10 seconds
        return { 
          allowed: false, 
          error: `Rate limit exceeded. Please wait ${Math.ceil((10000 - timeDiff) / 1000)} seconds.` 
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return { allowed: true }; // Allow on error
  }
}

// Extract message text from various WhatsApp message types
function extractMessageText(message: any): string {
  if (message.text?.body) {
    return sanitizeInput(message.text.body);
  }
  if (message.type === "reaction" && message.reaction?.emoji) {
    return `Reaction: ${sanitizeInput(message.reaction.emoji)}`;
  }
  if (message.type === "image" && message.image?.caption) {
    return sanitizeInput(message.image.caption);
  }
  if (message.type === "sticker") {
    return "[Sticker received]";
  }
  if (Array.isArray(message.errors) && message.errors.length > 0) {
    const err = message.errors[0];
    return `[Unsupported message] ${sanitizeInput(err.title) ?? "Unknown"}`;
  }
  return `[${sanitizeInput(message.type) ?? "unknown"} message received]`;
}

// Input validation
function validateMessageInput(messageText: string): { valid: boolean; error?: string } {
  if (typeof messageText !== "string") {
    return { valid: false, error: "Message must be a string" };
  }
  if (messageText.length > 2000) {
    return { valid: false, error: "Message exceeds 2000 character limit" };
  }
  return { valid: true };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  try {
    // GET: Webhook verification
    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verification successful");
        return new Response(challenge, { status: 200, headers: corsHeaders });
      } else {
        console.warn("❌ Webhook verification failed", { mode, token: token ? "provided" : "missing" });
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
    }

    // POST: Incoming messages
    if (req.method === "POST") {
      const rawBody = await req.text();
      
      // Optional signature verification
      if (WEBHOOK_SECRET) {
        const signature = req.headers.get("x-hub-signature-256") || "";
        const isValidSignature = await verifySignature(rawBody, signature);
        
        if (!isValidSignature) {
          console.warn("❌ Invalid webhook signature");
          return new Response(JSON.stringify({ error: "Invalid signature" }), { 
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      let body;
      try {
        body = JSON.parse(rawBody);
      } catch (error) {
        console.error("❌ Failed to parse JSON:", error);
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Process status updates (delivery receipts)
      const statuses = body?.entry?.[0]?.changes?.[0]?.value?.statuses;
      if (statuses) {
        console.log("📨 Processing status updates:", statuses.length);
        
        const statusLogs = statuses.map((s: any) => ({
          phone_number: sanitizeInput(s.recipient_id || ""),
          contact_name: "Unknown",
          message_id: sanitizeInput(s.id || ""),
          message_content: sanitizeInput(s.status || ""),
          message_type: "status",
          timestamp: new Date(+s.timestamp * 1000).toISOString(),
          received_at: new Date().toISOString(),
          processed: true,
          processed_at: new Date().toISOString()
        }));

        await supabase.from("whatsapp_logs").insert(statusLogs);
        return new Response(JSON.stringify({ success: true }), { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Process incoming messages
      const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
      const contacts = body?.entry?.[0]?.changes?.[0]?.value?.contacts;
      
      if (messages && messages.length > 0) {
        console.log("📥 Processing messages:", messages.length);
        
        for (const message of messages) {
          const phoneNumber = sanitizeInput(message.from || "");
          const messageId = sanitizeInput(message.id || "");
          const messageText = extractMessageText(message);
          const contactName = contacts?.find((c: any) => c.wa_id === message.from)?.profile?.name || "Unknown";
          const timestamp = new Date(+message.timestamp * 1000).toISOString();

          // Rate limiting check
          const rateLimitCheck = await checkRateLimit(phoneNumber);
          if (!rateLimitCheck.allowed) {
            console.warn("⚠️ Rate limit exceeded for:", phoneNumber);
            return new Response(JSON.stringify({ error: rateLimitCheck.error }), { 
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Input validation
          const validationResult = validateMessageInput(messageText);
          if (!validationResult.valid) {
            console.warn("⚠️ Invalid input:", validationResult.error);
            return new Response(JSON.stringify({ error: validationResult.error }), { 
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Log message to whatsapp_logs
          const { error: logError } = await supabase.from("whatsapp_logs").insert({
            phone_number: phoneNumber,
            contact_name: sanitizeInput(contactName),
            message_id: messageId,
            message_content: messageText,
            message_type: sanitizeInput(message.type || "text"),
            timestamp,
            received_at: new Date().toISOString(),
            processed: false
          });

          if (logError) {
            console.error("❌ Failed to log message:", logError);
            continue;
          }

          // Forward text messages to mcp-orchestrator
          if (message.type === "text" && messageText.trim()) {
            try {
              const { error: mcpError } = await supabase.functions.invoke("mcp-orchestrator", {
                body: {
                  phone_number: phoneNumber,
                  message: messageText,
                  message_id: messageId,
                  contact_name: sanitizeInput(contactName),
                  timestamp
                }
              });

              if (mcpError) {
                console.error("❌ MCP Orchestrator error:", mcpError);
              } else {
                console.log("✅ Message forwarded to MCP Orchestrator");
              }
            } catch (error) {
              console.error("❌ Failed to invoke MCP Orchestrator:", error);
            }
          }

          // Mark message as processed
          await supabase
            .from("whatsapp_logs")
            .update({ 
              processed: true, 
              processed_at: new Date().toISOString() 
            })
            .eq("message_id", messageId);

          console.log("✅ Message processed:", { phoneNumber, messageId, messageType: message.type });
        }
      }

      return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});