import { sendButtons, sendImageUrl, sendList, sendText } from "../wa/client.ts";
import { ConversationContext } from "../state/types.ts";
import { clearState, setState } from "../state/store.ts";
import { sb } from "../config.ts";
import { safeButtonTitle, safeRowDesc, safeRowTitle } from "../utils/text.ts";
import { e164, to07FromE164 } from "../utils/phone.ts";
import { buildShareLink, buildShareQR } from "../utils/share.ts";

interface BasketRow {
  id: string;
  name: string;
  description?: string | null;
  type?: string | null;
  status?: string | null;
  public_slug?: string | null;
  creator_id: string;
  momo_target?: string | null;
  momo_is_code?: boolean | null;
  created_at?: string;
}

interface BasketMemberRow {
  user_id: string;
  total_contributed?: number | null;
  joined_at?: string | null;
  profiles?: {
    whatsapp_e164?: string | null;
  } | null;
}

interface ContributionRow {
  id: string;
  basket_id: string;
  contributor_user_id: string;
  amount_rwf: number;
  status: string;
}

interface CreateBasketState {
  name?: string;
  description?: string;
  type?: "public" | "private";
  momo_target?: string | null;
  momo_is_code?: boolean | null;
}

const PAGE_SIZE = 5;

function slugifyName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function fetchBasket(id: string): Promise<BasketRow | null> {
  try {
    const { data, error } = await sb
      .from("baskets")
      .select("id,name,description,type,status,public_slug,creator_id,momo_target,momo_is_code,created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as BasketRow ?? null;
  } catch (err) {
    console.error("fetchBasket failed", err);
    return null;
  }
}

async function fetchBasketByToken(token: string): Promise<BasketRow | null> {
  try {
    const { data, error } = await sb
      .from("baskets")
      .select("id,name,description,type,status,public_slug,creator_id")
      .or(`public_slug.eq.${token},id.eq.${token}`)
      .maybeSingle();
    if (error) throw error;
    return data as BasketRow ?? null;
  } catch (err) {
    console.error("fetchBasketByToken failed", err);
    return null;
  }
}

async function loadUserBaskets(userId: string): Promise<BasketRow[]> {
  const baskets: Record<string, BasketRow> = {};
  try {
    const owned = await sb
      .from("baskets")
      .select("id,name,description,type,status,public_slug,creator_id,momo_target,momo_is_code,created_at")
      .eq("creator_id", userId);
    if (!owned.error) {
      for (const row of owned.data as BasketRow[]) {
        baskets[row.id] = row;
      }
    }
  } catch (err) {
    console.error("loadUserBaskets owned failed", err);
  }

  try {
    const member = await sb
      .from("basket_members")
      .select("basket_id,baskets(id,name,description,type,status,public_slug,creator_id,momo_target,momo_is_code,created_at)")
      .eq("user_id", userId);
    if (!member.error) {
      const memberRows = (member.data ?? []) as unknown as { basket_id: string; baskets: BasketRow | null }[];
      for (const row of memberRows) {
        if (row.baskets) {
          baskets[row.basket_id] = row.baskets;
        }
      }
    }
  } catch (err) {
    console.error("loadUserBaskets member failed", err);
  }

  return Object.values(baskets);
}

async function ensureMember(basketId: string, userId: string) {
  try {
    await sb
      .from("basket_members")
      .upsert({
        basket_id: basketId,
        user_id: userId,
        joined_at: new Date().toISOString(),
      }, { onConflict: "basket_id,user_id" });
  } catch (err) {
    console.error("ensureMember failed", err);
  }
}

async function removeMember(basketId: string, userId: string) {
  try {
    await sb
      .from("basket_members")
      .delete()
      .eq("basket_id", basketId)
      .eq("user_id", userId);
  } catch (err) {
    console.error("removeMember failed", err);
  }
}

async function insertContribution(basketId: string, userId: string, amount: number): Promise<string | null> {
  try {
    const { data, error } = await sb
      .from("basket_contributions")
      .insert({
        basket_id: basketId,
        contributor_user_id: userId,
        amount_rwf: amount,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    return data?.id as string;
  } catch (err) {
    console.error("insertContribution failed", err);
    return null;
  }
}

async function updateContributionStatus(id: string, status: "approved" | "rejected", approver: string) {
  try {
    const payload = {
      status,
      approver_user_id: approver,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    await sb
      .from("basket_contributions")
      .update(payload)
      .eq("id", id);
  } catch (err) {
    console.error("updateContributionStatus failed", err);
  }
}

async function incrementMemberTotal(basketId: string, userId: string, amount: number) {
  try {
    const { data, error } = await sb
      .from("basket_members")
      .select("total_contributed")
      .eq("basket_id", basketId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    const prev = Number(data?.total_contributed ?? 0);
    await sb
      .from("basket_members")
      .upsert({
        basket_id: basketId,
        user_id: userId,
        total_contributed: prev + amount,
        joined_at: new Date().toISOString(),
      }, { onConflict: "basket_id,user_id" });
  } catch (err) {
    console.error("incrementMemberTotal failed", err);
  }
}

async function fetchContribution(id: string): Promise<ContributionRow | null> {
  try {
    const { data, error } = await sb
      .from("basket_contributions")
      .select("id,basket_id,contributor_user_id,amount_rwf,status")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as ContributionRow ?? null;
  } catch (err) {
    console.error("fetchContribution failed", err);
    return null;
  }
}

async function notifyContributor(contrib: ContributionRow, message: string) {
  try {
    const { data, error } = await sb
      .from("profiles")
      .select("whatsapp_e164")
      .eq("user_id", contrib.contributor_user_id)
      .maybeSingle();
    if (error) throw error;
    const wa = data?.whatsapp_e164;
    if (wa) {
      await sendText(wa, message);
    }
  } catch (err) {
    console.error("notifyContributor failed", err);
  }
}

async function notifyCreatorOfContribution(basket: BasketRow, contributionId: string, amount: number, contributor: string) {
  try {
    const digits = e164(contributor || "");
    const contributorDisplay = to07FromE164(digits);
    const { data, error } = await sb
      .from("profiles")
      .select("whatsapp_e164")
      .eq("user_id", basket.creator_id)
      .maybeSingle();
    if (error) throw error;
    const wa = data?.whatsapp_e164;
    if (wa) {
      await sendButtons(wa, `Contribution request: RWF ${amount.toLocaleString()} from ${contributorDisplay} for ${basket.name}`, [
        { id: `bk_appr_${contributionId}`, title: safeButtonTitle("Approve") },
        { id: `bk_rej_${contributionId}`, title: safeButtonTitle("Reject") },
      ]);
    }
  } catch (err) {
    console.error("notifyCreatorOfContribution failed", err);
  }
}

function buildSharePayload(basket: BasketRow) {
  const token = basket.public_slug || basket.id;
  const prefill = `JOIN_BASKET:${token}`;
  return { token, prefill };
}

async function sendShareLinks(to: string, basket: BasketRow) {
  const { token, prefill } = buildSharePayload(basket);
  const link = await buildShareLink(undefined, prefill);
  const qr = await buildShareQR(link);
  await sendText(to, `Share this basket link:\n${link}\nUse code: JOIN_BASKET:${token}`);
  await sendImageUrl(to, qr, `${basket.name} basket QR`);
}

function parseContributionId(id: string): string {
  return id.replace(/^bk_(?:appr|rej)_/, "");
}

async function listMembers(ctx: ConversationContext, basket: BasketRow, page: number) {
  try {
    const { data, error } = await sb
      .from("basket_members")
      .select("user_id,total_contributed,joined_at,profiles(whatsapp_e164)")
      .eq("basket_id", basket.id)
      .order("joined_at", { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw error;
    const members = data as BasketMemberRow[];
    if (!members.length) {
      await sendText(ctx.phone, "No more members to show.");
      return;
    }
    const lines = members.map((m, idx) => {
      const wa = m.profiles?.whatsapp_e164 ? to07FromE164(m.profiles.whatsapp_e164) : m.user_id.slice(0, 8);
      const contributed = Number(m.total_contributed ?? 0).toLocaleString();
      return `${page * PAGE_SIZE + idx + 1}. ${wa} • RWF ${contributed}`;
    });
    await sendButtons(ctx.phone, `Members for ${basket.name}\n${lines.join("\n")}`, [
      { id: `bk_mems_${basket.id}_${page + 1}`, title: safeButtonTitle("More") },
      { id: "back_home", title: safeButtonTitle("Back") },
    ]);
  } catch (err) {
    console.error("listMembers failed", err);
    await sendText(ctx.phone, "Could not load members right now.");
  }
}

async function showBasketActions(ctx: ConversationContext, basket: BasketRow) {
  const buttons = [
    { id: `bk_det_${basket.id}`, title: safeButtonTitle("Details") },
    { id: `bk_cont_${basket.id}`, title: safeButtonTitle("Contribute") },
    { id: `bk_share_${basket.id}`, title: safeButtonTitle("Share") },
  ];
  buttons.push({ id: `bk_qr_${basket.id}`, title: safeButtonTitle("QR") });
  buttons.push({ id: `bk_mems_${basket.id}_0`, title: safeButtonTitle("Members") });
  if (basket.status !== "closed") {
    buttons.push({ id: `bk_leave_${basket.id}`, title: safeButtonTitle("Leave") });
  }
  if (ctx.userId === basket.creator_id) {
    if (basket.status !== "closed") {
      buttons.push({ id: `bk_close_${basket.id}`, title: safeButtonTitle("Close") });
    }
  } else {
    buttons.push({ id: `bk_join_${basket.id}`, title: safeButtonTitle("Join") });
  }
  await sendButtons(ctx.phone, `Basket: ${basket.name}`, buttons.slice(0, 3));
  if (buttons.length > 3) {
    await sendButtons(ctx.phone, "More actions", buttons.slice(3, 6));
  }
}

export async function startBaskets(ctx: ConversationContext) {
  const baskets = await loadUserBaskets(ctx.userId);
  const rows = baskets.slice(0, 10).map((basket) => ({
    id: `b_${basket.id}`,
    title: safeRowTitle(basket.name || "(untitled)"),
    description: safeRowDesc(`${basket.type ?? ""} • ${basket.status ?? ""}`.trim()),
  }));
  rows.push({ id: "bk_new", title: "Create basket", description: "Start a new basket" });
  rows.push({ id: "bk_join_code", title: "Join via code", description: "Send JOIN_BASKET:<code>" });

  await sendList(ctx.phone, {
    title: "Baskets",
    body: "Manage or create baskets.",
    buttonText: "Open",
    sectionTitle: "Your Baskets",
    rows,
  });
  await setState(ctx.userId, "basket_ctx", {});
  ctx.state = { key: "basket_ctx", data: {} };
}

export async function handleBasketListSelection(ctx: ConversationContext, id: string) {
  if (id === "bk_new") {
    await sendText(ctx.phone, "What is the basket name?");
    await setState(ctx.userId, "await_basket_name", {});
    ctx.state = { key: "await_basket_name", data: {} };
    return;
  }
  if (id === "bk_join_code") {
    await sendText(ctx.phone, "Send the JOIN_BASKET:<code> you received.");
    return;
  }
  if (id.startsWith("b_")) {
    const basketId = id.replace("b_", "");
    const basket = await fetchBasket(basketId);
    if (!basket) {
      await sendText(ctx.phone, "Basket not found.");
      return;
    }
    await showBasketActions(ctx, basket);
    return;
  }
}

export async function handleBasketText(ctx: ConversationContext, text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (trimmed.toUpperCase().startsWith("JOIN_BASKET:")) {
    const token = trimmed.slice("JOIN_BASKET:".length).trim();
    await handleJoinToken(ctx, token);
    return true;
  }

  switch (ctx.state.key) {
    case "await_basket_name":
      await handleBasketName(ctx, trimmed);
      return true;
    case "await_basket_desc":
      await handleBasketDesc(ctx, trimmed);
      return true;
    case "await_basket_momo":
      await handleBasketMomo(ctx, trimmed);
      return true;
    case "await_basket_confirm":
      if (trimmed.toLowerCase() === "yes") {
        await finalizeBasket(ctx);
        return true;
      }
      if (trimmed.toLowerCase() === "no") {
        await sendText(ctx.phone, "Cancelled basket creation.");
        await startBaskets(ctx);
        return true;
      }
      await sendText(ctx.phone, "Reply YES to confirm or NO to cancel.");
      return true;
    case "await_contrib_amount":
      await handleContributionAmount(ctx, trimmed);
      return true;
    default:
      break;
  }
  return false;
}

async function handleBasketName(ctx: ConversationContext, name: string) {
  if (!name) {
    await sendText(ctx.phone, "Name cannot be empty.");
    return;
  }
  const data: CreateBasketState = { name };
  await sendText(ctx.phone, "Describe the basket (optional).");
  await setState(ctx.userId, "await_basket_desc", data);
  ctx.state = { key: "await_basket_desc", data };
}

async function handleBasketDesc(ctx: ConversationContext, desc: string) {
  const current = ctx.state.data as CreateBasketState | undefined;
  if (!current?.name) {
    await startBaskets(ctx);
    return;
  }
  const data = { ...current, description: desc };
  await sendButtons(ctx.phone, "Is this basket Public or Private?", [
    { id: "bk_type_public", title: "Public" },
    { id: "bk_type_private", title: "Private" },
  ]);
  await setState(ctx.userId, "await_basket_type", data);
  ctx.state = { key: "await_basket_type", data };
}

export async function handleBasketType(ctx: ConversationContext, id: string) {
  const current = ctx.state.data as CreateBasketState | undefined;
  if (!current?.name) {
    await startBaskets(ctx);
    return;
  }
  const type = id === "bk_type_public" ? "public" : "private";
  const data = { ...current, type };
  await sendText(ctx.phone, "Provide MoMo number/code for contributions, or reply SKIP.");
  await setState(ctx.userId, "await_basket_momo", data);
  ctx.state = { key: "await_basket_momo", data };
}

async function handleBasketMomo(ctx: ConversationContext, text: string) {
  const current = ctx.state.data as CreateBasketState | undefined;
  if (!current?.name || !current.type) {
    await startBaskets(ctx);
    return;
  }
  let momo_target: string | null = null;
  let momo_is_code: boolean | null = null;
  const trimmed = text.trim();
  if (trimmed.toLowerCase() !== "skip" && trimmed !== "") {
    momo_target = trimmed;
    const digits = trimmed.replace(/\D/g, "");
    momo_is_code = digits.length >= 4 && digits.length <= 9;
  }
  const data: CreateBasketState = { ...current, momo_target, momo_is_code };
  await sendText(ctx.phone, `Confirm basket creation?\nName: ${data.name}\nType: ${data.type}\nMoMo: ${data.momo_target ?? "(none)"}\nReply YES to confirm or NO to cancel.`);
  await setState(ctx.userId, "await_basket_confirm", data);
  ctx.state = { key: "await_basket_confirm", data };
}

async function finalizeBasket(ctx: ConversationContext) {
  const data = ctx.state.data as CreateBasketState | undefined;
  if (!data?.name || !data.type) {
    await startBaskets(ctx);
    return;
  }
  const slug = data.type === "public" ? `${slugifyName(data.name)}-${crypto.randomUUID().slice(0, 6)}` : null;
  try {
    const { data: inserted, error } = await sb
      .from("baskets")
      .insert({
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        status: data.type === "public" ? "pending" : "active",
        creator_id: ctx.userId,
        public_slug: slug,
        momo_target: data.momo_target ?? null,
        momo_is_code: data.momo_is_code ?? null,
        created_at: new Date().toISOString(),
      })
      .select("id,name,type,status,public_slug,creator_id,momo_target,momo_is_code")
      .single();
    if (error) throw error;
    const basket = inserted as BasketRow;
    await ensureMember(basket.id, ctx.userId);
    if (basket.type === "public") {
      await sendText(ctx.phone, "Basket created and sent for review. We'll notify you once approved.");
    } else {
      await sendText(ctx.phone, "✅ Basket created! You can share it now.");
      await sendShareLinks(ctx.phone, basket);
    }
  } catch (err) {
    console.error("finalizeBasket failed", err);
    await sendText(ctx.phone, "Could not create basket. Try again later.");
  }
  await clearState(ctx.userId);
  await startBaskets(ctx);
}

async function handleContributionAmount(ctx: ConversationContext, text: string) {
  const amount = Number.parseInt(text.replace(/\D/g, ""), 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    await sendText(ctx.phone, "Enter a valid amount (numbers only).");
    return;
  }
  const current = ctx.state.data as { basket_id?: string } | undefined;
  const basketId = current?.basket_id;
  if (!basketId) {
    await startBaskets(ctx);
    return;
  }
  await ensureMember(basketId, ctx.userId);
  const contribId = await insertContribution(basketId, ctx.userId, amount);
  if (!contribId) {
    await sendText(ctx.phone, "Could not submit contribution. Try later.");
    await startBaskets(ctx);
    return;
  }
  const basket = await fetchBasket(basketId);
  if (basket) {
    await notifyCreatorOfContribution(basket, contribId, amount, ctx.phone);
  }
  await sendText(ctx.phone, "Contribution submitted for approval.");
  await clearState(ctx.userId);
  await startBaskets(ctx);
}

export async function handleBasketButton(ctx: ConversationContext, id: string) {
  if (id.startsWith("bk_det_")) {
    const basketId = id.replace("bk_det_", "");
    const basket = await fetchBasket(basketId);
    if (!basket) {
      await sendText(ctx.phone, "Basket not found.");
      return;
    }
    await sendText(ctx.phone, `Basket: ${basket.name}\nType: ${basket.type}\nStatus: ${basket.status}\nDescription: ${basket.description ?? "(none)"}`);
    return;
  }
  if (id.startsWith("bk_cont_")) {
    const basketId = id.replace("bk_cont_", "");
    await sendText(ctx.phone, "Enter contribution amount (RWF).");
    await setState(ctx.userId, "await_contrib_amount", { basket_id: basketId });
    ctx.state = { key: "await_contrib_amount", data: { basket_id: basketId } };
    return;
  }
  if (id.startsWith("bk_share_")) {
    const basketId = id.replace("bk_share_", "");
    const basket = await fetchBasket(basketId);
    if (!basket) {
      await sendText(ctx.phone, "Basket not found.");
      return;
    }
    await sendShareLinks(ctx.phone, basket);
    return;
  }
  if (id.startsWith("bk_qr_")) {
    const basketId = id.replace("bk_qr_", "");
    const basket = await fetchBasket(basketId);
    if (!basket) {
      await sendText(ctx.phone, "Basket not found.");
      return;
    }
    const { prefill } = buildSharePayload(basket);
    const link = await buildShareLink(undefined, prefill);
    const qr = await buildShareQR(link);
    await sendImageUrl(ctx.phone, qr, `${basket.name} basket QR`);
    return;
  }
  if (id.startsWith("bk_mems_")) {
    const [, basketId, pageRaw] = id.split("_");
    const basket = await fetchBasket(basketId);
    if (!basket) {
      await sendText(ctx.phone, "Basket not found.");
      return;
    }
    const page = Number.parseInt(pageRaw ?? "0", 10) || 0;
    await listMembers(ctx, basket, page);
    return;
  }
  if (id.startsWith("bk_join_")) {
    const basketId = id.replace("bk_join_", "");
    await ensureMember(basketId, ctx.userId);
    await sendText(ctx.phone, "Joined the basket successfully.");
    return;
  }
  if (id.startsWith("bk_leave_")) {
    const basketId = id.replace("bk_leave_", "");
    await removeMember(basketId, ctx.userId);
    await sendText(ctx.phone, "You have left the basket.");
    return;
  }
  if (id.startsWith("bk_close_")) {
    const basketId = id.replace("bk_close_", "");
    const basket = await fetchBasket(basketId);
    if (!basket || basket.creator_id !== ctx.userId) {
      await sendText(ctx.phone, "Only the creator can close this basket.");
      return;
    }
    try {
      await sb.from("baskets").update({ status: "closed" }).eq("id", basketId);
      await sendText(ctx.phone, "Basket closed.");
    } catch (err) {
      console.error("close basket failed", err);
      await sendText(ctx.phone, "Could not close basket.");
    }
    return;
  }
  if (id.startsWith("bk_appr_")) {
    const contribId = parseContributionId(id);
    const contrib = await fetchContribution(contribId);
    if (!contrib) {
      await sendText(ctx.phone, "Contribution not found.");
      return;
    }
    const basket = await fetchBasket(contrib.basket_id);
    if (!basket || basket.creator_id !== ctx.userId) {
      await sendText(ctx.phone, "Only the creator can approve contributions.");
      return;
    }
    await updateContributionStatus(contribId, "approved", ctx.userId);
    await incrementMemberTotal(contrib.basket_id, contrib.contributor_user_id, contrib.amount_rwf);
    await notifyContributor(contrib, "✅ Contribution approved! Thank you.");
    await sendText(ctx.phone, "Contribution approved.");
    return;
  }
  if (id.startsWith("bk_rej_")) {
    const contribId = parseContributionId(id);
    const contrib = await fetchContribution(contribId);
    if (!contrib) {
      await sendText(ctx.phone, "Contribution not found.");
      return;
    }
    const basket = await fetchBasket(contrib.basket_id);
    if (!basket || basket.creator_id !== ctx.userId) {
      await sendText(ctx.phone, "Only the creator can reject contributions.");
      return;
    }
    await updateContributionStatus(contribId, "rejected", ctx.userId);
    await notifyContributor(contrib, "❌ Contribution rejected by the basket creator.");
    await sendText(ctx.phone, "Contribution rejected.");
    return;
  }
}

export async function handleBasketTypeButton(ctx: ConversationContext, id: string) {
  if (id === "bk_type_public" || id === "bk_type_private") {
    await handleBasketType(ctx, id);
  }
}

export async function handleJoinToken(ctx: ConversationContext, token: string) {
  if (!token) {
    await sendText(ctx.phone, "Invalid code.");
    return;
  }
  const basket = await fetchBasketByToken(token);
  if (!basket) {
    await sendText(ctx.phone, "No basket found for that code.");
    return;
  }
  await ensureMember(basket.id, ctx.userId);
  await sendText(ctx.phone, `Joined basket ${basket.name}.`);
  await showBasketActions(ctx, basket);
}
