import { sendButtons, sendText } from "../wa/client.ts";
import { ConversationContext } from "../state/types.ts";
import { clearState, setState } from "../state/store.ts";
import { sb, OPENAI_API_KEY } from "../config.ts";
import { fetchWAMedia, extOf } from "../utils/media.ts";

interface InsuranceLead {
  id: string;
  whatsapp: string;
  file_path?: string | null;
  raw_ocr?: unknown;
  extracted?: unknown;
}

const FALLBACK_MESSAGE = "Received your document; an agent will review it.";

let cachedAdmins: { numbers: string[]; fetchedAt: number } | null = null;

async function getAdminNumbers(): Promise<string[]> {
  const now = Date.now();
  if (cachedAdmins && now - cachedAdmins.fetchedAt < 5 * 60 * 1000) {
    return cachedAdmins.numbers;
  }
  try {
    const { data, error } = await sb
      .from("app_config")
      .select("insurance_admin_numbers")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    const nums = Array.isArray(data?.insurance_admin_numbers)
      ? (data?.insurance_admin_numbers as string[])
      : [];
    cachedAdmins = { numbers: nums, fetchedAt: now };
    return nums;
  } catch (err) {
    console.error("getAdminNumbers failed", err);
    cachedAdmins = { numbers: [], fetchedAt: now };
    return [];
  }
}

async function upsertLead(phone: string): Promise<InsuranceLead> {
  const insert = await sb
    .from("insurance_leads")
    .insert({
      whatsapp: phone,
      created_at: new Date().toISOString(),
    })
    .select("id,whatsapp,file_path,raw_ocr,extracted")
    .single();
  if (insert.error) throw insert.error;
  return insert.data as InsuranceLead;
}

async function callOpenAI(url: string): Promise<{ raw: string | null; extracted: Record<string, unknown> | null }> {
  if (!OPENAI_API_KEY) {
    console.error("MISSING_OPENAI_API_KEY");
    return { raw: null, extracted: null };
  }
  try {
    const prompt = `You are an insurance document parser. Extract key details and respond ONLY with a minified JSON object using these keys: policy_holder, policy_number, vehicle_plate, insurer, coverage_type, premium, expiry_date, contact_phone, notes. Use null when unavailable. Document URL: ${url}`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          { role: "system", content: "You return only valid JSON with the requested keys." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error", text);
      return { raw: null, extracted: null };
    }
    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return { raw: null, extracted: null };
    }
    const parsed = JSON.parse(content);
    return { raw: content, extracted: normalizeExtracted(parsed) };
  } catch (err) {
    console.error("callOpenAI failed", err);
    return { raw: null, extracted: null };
  }
}

function normalizeExtracted(data: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  const policyHolder = (data?.policy_holder || data?.name || data?.insured_name) as string | undefined;
  if (policyHolder) normalized.policy_holder = String(policyHolder).trim();
  const policy = (data?.policy_number || data?.policy_no) as string | undefined;
  if (policy) normalized.policy_number = String(policy).trim();
  const plate = (data?.vehicle_plate || data?.plate || data?.registration) as string | undefined;
  if (plate) normalized.vehicle_plate = String(plate).replace(/\s+/g, "").toUpperCase();
  const insurer = data?.insurer as string | undefined;
  if (insurer) normalized.insurer = String(insurer).trim();
  const coverage = data?.coverage_type as string | undefined;
  if (coverage) normalized.coverage_type = String(coverage).trim();
  const premium = data?.premium as string | number | undefined;
  if (premium) normalized.premium = premium;
  const expiry = data?.expiry_date as string | undefined;
  if (expiry) {
    const date = new Date(expiry);
    if (!Number.isNaN(date.getTime())) {
      normalized.expiry_date = date.toISOString().slice(0, 10);
    }
  }
  const contact = data?.contact_phone as string | undefined;
  if (contact) normalized.contact_phone = String(contact).trim();
  const notes = data?.notes as string | undefined;
  if (notes) normalized.notes = String(notes).trim();
  return normalized;
}

function summaryFromExtracted(extracted: Record<string, unknown> | null): string {
  if (!extracted || Object.keys(extracted).length === 0) {
    return FALLBACK_MESSAGE;
  }
  const map: Record<string, string> = {
    policy_holder: "Policy Holder",
    policy_number: "Policy Number",
    vehicle_plate: "Plate",
    insurer: "Insurer",
    coverage_type: "Coverage",
    premium: "Premium",
    expiry_date: "Expiry Date",
    contact_phone: "Contact",
    notes: "Notes",
  };
  const lines: string[] = [];
  for (const [key, label] of Object.entries(map)) {
    if (extracted[key] != null && extracted[key] !== "") {
      lines.push(`${label}: ${extracted[key]}`);
    }
  }
  if (!lines.length) {
    return FALLBACK_MESSAGE;
  }
  return lines.join("\n");
}

export async function startInsurance(ctx: ConversationContext) {
  await sendText(ctx.phone, "Please send a clear photo or PDF of your insurance document.");
  await setState(ctx.userId, "ins_wait_doc", {});
  ctx.state = { key: "ins_wait_doc", data: {} };
}

export async function handleInsuranceText(ctx: ConversationContext, text: string): Promise<boolean> {
  if (ctx.state.key !== "ins_wait_doc") return false;
  await sendText(ctx.phone, "Send a photo or PDF of the insurance document to proceed.");
  return true;
}

export async function handleInsuranceMedia(ctx: ConversationContext, message: any) {
  const mediaId: string | undefined = message?.image?.id ?? message?.document?.id;
  const mimeType: string | undefined = message?.image?.mime_type ?? message?.document?.mime_type ?? message?.document?.mime_type ?? "application/octet-stream";
  if (!mediaId) {
    await sendText(ctx.phone, "Could not process the attachment. Please try again.");
    return;
  }

  try {
    const lead = await upsertLead(ctx.phone);
    const media = await fetchWAMedia(mediaId);
    const resolvedMime = media.mimeType || mimeType || "application/octet-stream";
    const extension = extOf(resolvedMime);
    const path = `${lead.id}/${Date.now()}_${mediaId}.${extension}`;
    const blob = new Blob([media.data], { type: resolvedMime });

    const upload = await sb.storage
      .from("insurance")
      .upload(path, blob, { contentType: media.mimeType || mimeType, upsert: true });
    if (upload.error) {
      const message = (upload.error as { message?: string } | null | undefined)?.message?.toLowerCase() ?? "";
      if (message.includes("bucket")) {
        console.error("MISSING_STORAGE_BUCKET", upload.error);
      }
      throw upload.error;
    }

    await sb.from("insurance_media").insert({
      lead_id: lead.id,
      wa_media_id: mediaId,
      storage_path: path,
      mime_type: resolvedMime,
      created_at: new Date().toISOString(),
    });

    const signed = await sb.storage.from("insurance").createSignedUrl(path, 60 * 60 * 24);
    if (signed.error) {
      console.error("INSURANCE_SIGNED_URL_FAILED", signed.error);
    }
    const signedUrl = signed.error ? null : signed.data?.signedUrl ?? null;

    const { raw, extracted } = signedUrl ? await callOpenAI(signedUrl) : { raw: null, extracted: null };

    await sb
      .from("insurance_leads")
      .update({
        file_path: path,
        raw_ocr: raw,
        extracted,
      })
      .eq("id", lead.id);

    const summary = summaryFromExtracted(extracted);
    await sendText(ctx.phone, `${summary}\n\nOur team will contact you soon.`);

    const adminNumbers = await getAdminNumbers();
    const adminSummary = `New insurance lead\nFrom: ${ctx.phone}\n${summary}\nDocument link: ${signedUrl ?? "(no link)"}`;
    for (const admin of adminNumbers) {
      const trimmed = String(admin ?? "").trim();
      if (!trimmed) continue;
      await sendText(trimmed, adminSummary);
    }
  } catch (err) {
    console.error("handleInsuranceMedia failed", err);
    await sendText(ctx.phone, "We couldn't process that file. Please try again or contact support.");
  } finally {
    await clearState(ctx.userId);
  }
}
