import { sendButtons, sendImageUrl, sendList, sendText } from "../wa/client.ts";
import { ConversationContext } from "../state/types.ts";
import { clearState, setState } from "../state/store.ts";
import { sb } from "../config.ts";
import { safeButtonTitle, safeRowDesc, safeRowTitle } from "../utils/text.ts";
import { e164, to07FromE164 } from "../utils/phone.ts";
import { buildShareLink, buildShareQR } from "../utils/share.ts";
import { ctxFromConversation, logError } from "../utils/logger.ts";
import type { LogContext } from "../utils/logger.ts";

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
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(
    /(^-|-$)/g,
    "",
  );
}

function replyText(ctx: ConversationContext, body: string) {
  return sendText(ctx.phone, body, ctxFromConversation(ctx));
}

function replyButtons(
  ctx: ConversationContext,
  body: string,
  buttons: Parameters<typeof sendButtons>[2],
) {
  return sendButtons(ctx.phone, body, buttons, ctxFromConversation(ctx));
}

function replyList(
  ctx: ConversationContext,
  options: Parameters<typeof sendList>[1],
) {
  return sendList(ctx.phone, options, ctxFromConversation(ctx));
}

function replyImage(ctx: ConversationContext, link: string, caption?: string) {
  return sendImageUrl(ctx.phone, link, caption, ctxFromConversation(ctx));
}

async function fetchBasket(
  id: string,
  logCtx: LogContext,
): Promise<BasketRow | null> {
  try {
    const { data, error } = await sb
      .from("baskets")
      .select(
        "id,name,description,type,status,public_slug,creator_id,momo_target,momo_is_code,created_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as BasketRow ?? null;
  } catch (err) {
    logError("BASKET_FETCH_FAILED", err, { basketId: id }, logCtx);
    return null;
  }
}

async function fetchBasketByToken(
  token: string,
  logCtx: LogContext,
): Promise<BasketRow | null> {
  try {
    const { data, error } = await sb
      .from("baskets")
      .select("id,name,description,type,status,public_slug,creator_id")
      .or(`public_slug.eq.${token},id.eq.${token}`)
      .maybeSingle();
    if (error) throw error;
    return data as BasketRow ?? null;
  } catch (err) {
    logError("BASKET_FETCH_BY_TOKEN_FAILED", err, { token }, logCtx);
    return null;
  }
}

async function loadUserBaskets(
  userId: string,
  logCtx: LogContext,
): Promise<BasketRow[]> {
  const baskets: Record<string, BasketRow> = {};
  try {
    const owned = await sb
      .from("baskets")
      .select(
        "id,name,description,type,status,public_slug,creator_id,momo_target,momo_is_code,created_at",
      )
      .eq("creator_id", userId);
    if (!owned.error) {
      for (const row of owned.data as BasketRow[]) {
        baskets[row.id] = row;
      }
    }
  } catch (err) {
    logError("BASKET_LIST_OWNED_FAILED", err, { userId }, logCtx);
  }

  try {
    const member = await sb
      .from("basket_members")
      .select(
        "basket_id,baskets(id,name,description,type,status,public_slug,creator_id,momo_target,momo_is_code,created_at)",
      )
      .eq("user_id", userId);
    if (!member.error) {
      const memberRows = (member.data ?? []) as unknown as {
        basket_id: string;
        baskets: BasketRow | null;
      }[];
      for (const row of memberRows) {
        if (row.baskets) {
          baskets[row.basket_id] = row.baskets;
        }
      }
    }
  } catch (err) {
    logError("BASKET_LIST_MEMBER_FAILED", err, { userId }, logCtx);
  }

  return Object.values(baskets);
}

async function ensureMember(
  basketId: string,
  userId: string,
  logCtx: LogContext,
) {
  try {
    await sb
      .from("basket_members")
      .upsert({
        basket_id: basketId,
        user_id: userId,
        joined_at: new Date().toISOString(),
      }, { onConflict: "basket_id,user_id" });
  } catch (err) {
    logError("BASKET_MEMBER_ENSURE_FAILED", err, { basketId, userId }, logCtx);
  }
}

async function removeMember(
  basketId: string,
  userId: string,
  logCtx: LogContext,
) {
  try {
    await sb
      .from("basket_members")
      .delete()
      .eq("basket_id", basketId)
      .eq("user_id", userId);
  } catch (err) {
    logError("BASKET_MEMBER_REMOVE_FAILED", err, { basketId, userId }, logCtx);
  }
}

async function insertContribution(
  basketId: string,
  userId: string,
  amount: number,
  logCtx: LogContext,
): Promise<string | null> {
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
    logError("BASKET_CONTRIB_INSERT_FAILED", err, { basketId, userId }, logCtx);
    return null;
  }
}

async function updateContributionStatus(
  id: string,
  status: "approved" | "rejected",
  approver: string,
  logCtx: LogContext,
) {
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
    logError("BASKET_CONTRIB_STATUS_FAILED", err, {
      contributionId: id,
      status,
    }, logCtx);
  }
}

async function incrementMemberTotal(
  basketId: string,
  userId: string,
  amount: number,
  logCtx: LogContext,
) {
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
    logError("BASKET_MEMBER_TOTAL_FAILED", err, { basketId, userId }, logCtx);
  }
}

async function fetchContribution(
  id: string,
  logCtx: LogContext,
): Promise<ContributionRow | null> {
  try {
    const { data, error } = await sb
      .from("basket_contributions")
      .select("id,basket_id,contributor_user_id,amount_rwf,status")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as ContributionRow ?? null;
  } catch (err) {
    logError(
      "BASKET_CONTRIB_FETCH_FAILED",
      err,
      { contributionId: id },
      logCtx,
    );
    return null;
  }
}

async function notifyContributor(
  ctx: ConversationContext,
  contrib: ContributionRow,
  message: string,
) {
  const logCtx = ctxFromConversation(ctx);
  try {
    const { data, error } = await sb
      .from("profiles")
      .select("whatsapp_e164")
      .eq("user_id", contrib.contributor_user_id)
      .maybeSingle();
    if (error) throw error;
    const wa = data?.whatsapp_e164;
    if (wa) {
      await sendText(wa, message, logCtx);
    }
  } catch (err) {
    logError("BASKET_NOTIFY_CONTRIBUTOR_FAILED", err, {
      contributionId: contrib.id,
    }, logCtx);
  }
}

async function notifyCreatorOfContribution(
  ctx: ConversationContext,
  basket: BasketRow,
  contributionId: string,
  amount: number,
  contributor: string,
) {
  const logCtx = ctxFromConversation(ctx);
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
      await sendButtons(
        wa,
        `Contribution request: RWF ${amount.toLocaleString()} from ${contributorDisplay} for ${basket.name}`,
        [
          {
            id: `bk_appr_${contributionId}`,
            title: safeButtonTitle("Approve"),
          },
          { id: `bk_rej_${contributionId}`, title: safeButtonTitle("Reject") },
        ],
        logCtx,
      );
    }
  } catch (err) {
    logError("BASKET_NOTIFY_CREATOR_FAILED", err, { contributionId }, logCtx);
  }
}

function buildSharePayload(basket: BasketRow) {
  const token = basket.public_slug || basket.id;
  const prefill = `JOIN_BASKET:${token}`;
  return { token, prefill };
}

async function sendShareLinks(ctx: ConversationContext, basket: BasketRow) {
  const { token, prefill } = buildSharePayload(basket);
  const link = await buildShareLink(undefined, prefill);
  const qr = await buildShareQR(link);
  await replyText(
    ctx,
    `Share this basket link:\n${link}\nUse code: JOIN_BASKET:${token}`,
  );
  await replyImage(ctx, qr, `${basket.name} basket QR`);
}

function parseContributionId(id: string): string {
  return id.replace(/^bk_(?:appr|rej)_/, "");
}

async function listMembers(
  ctx: ConversationContext,
  basket: BasketRow,
  page: number,
) {
  const logCtx = ctxFromConversation(ctx);
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
      await replyText(ctx, "No more members to show.");
      return;
    }
    const lines = members.map((m, idx) => {
      const wa = m.profiles?.whatsapp_e164
        ? to07FromE164(m.profiles.whatsapp_e164)
        : m.user_id.slice(0, 8);
      const contributed = Number(m.total_contributed ?? 0).toLocaleString();
      return `${page * PAGE_SIZE + idx + 1}. ${wa} • RWF ${contributed}`;
    });
    await replyButtons(ctx, `Members for ${basket.name}\n${lines.join("\n")}`, [
      {
        id: `bk_mems_${basket.id}_${page + 1}`,
        title: safeButtonTitle("More"),
      },
      { id: "back_home", title: safeButtonTitle("Back") },
    ]);
  } catch (err) {
    logError(
      "BASKET_MEMBERS_LIST_FAILED",
      err,
      { basketId: basket.id, page },
      logCtx,
    );
    await replyText(ctx, "Could not load members right now.");
  }
}

async function showBasketActions(ctx: ConversationContext, basket: BasketRow) {
  const buttons = [
    { id: `bk_det_${basket.id}`, title: safeButtonTitle("Details") },
    { id: `bk_cont_${basket.id}`, title: safeButtonTitle("Contribute") },
    { id: `bk_share_${basket.id}`, title: safeButtonTitle("Share") },
  ];
  buttons.push({ id: `bk_qr_${basket.id}`, title: safeButtonTitle("QR") });
  buttons.push({
    id: `bk_mems_${basket.id}_0`,
    title: safeButtonTitle("Members"),
  });
  if (basket.status !== "closed") {
    buttons.push({
      id: `bk_leave_${basket.id}`,
      title: safeButtonTitle("Leave"),
    });
  }
  if (ctx.userId === basket.creator_id) {
    if (basket.status !== "closed") {
      buttons.push({
        id: `bk_close_${basket.id}`,
        title: safeButtonTitle("Close"),
      });
    }
  } else {
    buttons.push({
      id: `bk_join_${basket.id}`,
      title: safeButtonTitle("Join"),
    });
  }
  await replyButtons(ctx, `Basket: ${basket.name}`, buttons.slice(0, 3));
  if (buttons.length > 3) {
    await replyButtons(ctx, "More actions", buttons.slice(3, 6));
  }
}

export async function startBaskets(ctx: ConversationContext) {
  const logCtx = ctxFromConversation(ctx);
  const baskets = await loadUserBaskets(ctx.userId, logCtx);
  const rows = baskets.slice(0, 10).map((basket) => ({
    id: `b_${basket.id}`,
    title: safeRowTitle(basket.name || "(untitled)"),
    description: safeRowDesc(
      `${basket.type ?? ""} • ${basket.status ?? ""}`.trim(),
    ),
  }));
  rows.push({
    id: "bk_new",
    title: "Create basket",
    description: "Start a new basket",
  });
  rows.push({
    id: "bk_join_code",
    title: "Join via code",
    description: "Send JOIN_BASKET:<code>",
  });

  await replyList(ctx, {
    title: "Baskets",
    body: "Manage or create baskets.",
    buttonText: "Open",
    sectionTitle: "Your Baskets",
    rows,
  });
  await setState(ctx.userId, "basket_ctx", {});
  ctx.state = { key: "basket_ctx", data: {} };
}

export async function handleBasketListSelection(
  ctx: ConversationContext,
  id: string,
) {
  const logCtx = ctxFromConversation(ctx);
  if (id === "bk_new") {
    await replyText(ctx, "What is the basket name?");
    await setState(ctx.userId, "await_basket_name", {});
    ctx.state = { key: "await_basket_name", data: {} };
    return;
  }
  if (id === "bk_join_code") {
    await replyText(ctx, "Send the JOIN_BASKET:<code> you received.");
    return;
  }
  if (id.startsWith("b_")) {
    const basketId = id.replace("b_", "");
    const basket = await fetchBasket(basketId, logCtx);
    if (!basket) {
      await replyText(ctx, "Basket not found.");
      return;
    }
    await showBasketActions(ctx, basket);
    return;
  }
}

export async function handleBasketText(
  ctx: ConversationContext,
  text: string,
): Promise<boolean> {
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
        await replyText(ctx, "Cancelled basket creation.");
        await startBaskets(ctx);
        return true;
      }
      await replyText(ctx, "Reply YES to confirm or NO to cancel.");
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
    await replyText(ctx, "Name cannot be empty.");
    return;
  }
  const data: CreateBasketState = { name };
  await replyText(ctx, "Describe the basket (optional).");
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
  await replyButtons(ctx, "Is this basket Public or Private?", [
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
  await replyText(
    ctx,
    "Provide MoMo number/code for contributions, or reply SKIP.",
  );
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
  await replyText(
    ctx,
    `Confirm basket creation?\nName: ${data.name}\nType: ${data.type}\nMoMo: ${
      data.momo_target ?? "(none)"
    }\nReply YES to confirm or NO to cancel.`,
  );
  await setState(ctx.userId, "await_basket_confirm", data);
  ctx.state = { key: "await_basket_confirm", data };
}

async function finalizeBasket(ctx: ConversationContext) {
  const logCtx = ctxFromConversation(ctx);
  const data = ctx.state.data as CreateBasketState | undefined;
  if (!data?.name || !data.type) {
    await startBaskets(ctx);
    return;
  }
  const slug = data.type === "public"
    ? `${slugifyName(data.name)}-${crypto.randomUUID().slice(0, 6)}`
    : null;
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
      .select(
        "id,name,type,status,public_slug,creator_id,momo_target,momo_is_code",
      )
      .single();
    if (error) throw error;
    const basket = inserted as BasketRow;
    await ensureMember(basket.id, ctx.userId, logCtx);
    if (basket.type === "public") {
      await replyText(
        ctx,
        "Basket created and sent for review. We'll notify you once approved.",
      );
    } else {
      await replyText(ctx, "✅ Basket created! You can share it now.");
      await sendShareLinks(ctx, basket);
    }
  } catch (err) {
    logError("BASKET_FINALIZE_FAILED", err, { userId: ctx.userId }, logCtx);
    await replyText(ctx, "Could not create basket. Try again later.");
  }
  await clearState(ctx.userId);
  await startBaskets(ctx);
}

async function handleContributionAmount(
  ctx: ConversationContext,
  text: string,
) {
  const logCtx = ctxFromConversation(ctx);
  const amount = Number.parseInt(text.replace(/\D/g, ""), 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    await replyText(ctx, "Enter a valid amount (numbers only).");
    return;
  }
  const current = ctx.state.data as { basket_id?: string } | undefined;
  const basketId = current?.basket_id;
  if (!basketId) {
    await startBaskets(ctx);
    return;
  }
  await ensureMember(basketId, ctx.userId, logCtx);
  const contribId = await insertContribution(
    basketId,
    ctx.userId,
    amount,
    logCtx,
  );
  if (!contribId) {
    await replyText(ctx, "Could not submit contribution. Try later.");
    await startBaskets(ctx);
    return;
  }
  const basket = await fetchBasket(basketId, logCtx);
  if (basket) {
    await notifyCreatorOfContribution(
      ctx,
      basket,
      contribId,
      amount,
      ctx.phone,
    );
  }
  await replyText(ctx, "Contribution submitted for approval.");
  await clearState(ctx.userId);
  await startBaskets(ctx);
}

export async function handleBasketButton(ctx: ConversationContext, id: string) {
  const logCtx = ctxFromConversation(ctx);
  if (id.startsWith("bk_det_")) {
    const basketId = id.replace("bk_det_", "");
    const basket = await fetchBasket(basketId, logCtx);
    if (!basket) {
      await replyText(ctx, "Basket not found.");
      return;
    }
    await replyText(
      ctx,
      `Basket: ${basket.name}\nType: ${basket.type}\nStatus: ${basket.status}\nDescription: ${
        basket.description ?? "(none)"
      }`,
    );
    return;
  }
  if (id.startsWith("bk_cont_")) {
    const basketId = id.replace("bk_cont_", "");
    await replyText(ctx, "Enter contribution amount (RWF).");
    await setState(ctx.userId, "await_contrib_amount", { basket_id: basketId });
    ctx.state = { key: "await_contrib_amount", data: { basket_id: basketId } };
    return;
  }
  if (id.startsWith("bk_share_")) {
    const basketId = id.replace("bk_share_", "");
    const basket = await fetchBasket(basketId, logCtx);
    if (!basket) {
      await replyText(ctx, "Basket not found.");
      return;
    }
    await sendShareLinks(ctx, basket);
    return;
  }
  if (id.startsWith("bk_qr_")) {
    const basketId = id.replace("bk_qr_", "");
    const basket = await fetchBasket(basketId, logCtx);
    if (!basket) {
      await replyText(ctx, "Basket not found.");
      return;
    }
    const { prefill } = buildSharePayload(basket);
    const link = await buildShareLink(undefined, prefill);
    const qr = await buildShareQR(link);
    await replyImage(ctx, qr, `${basket.name} basket QR`);
    return;
  }
  if (id.startsWith("bk_mems_")) {
    const [, basketId, pageRaw] = id.split("_");
    const basket = await fetchBasket(basketId, logCtx);
    if (!basket) {
      await replyText(ctx, "Basket not found.");
      return;
    }
    const page = Number.parseInt(pageRaw ?? "0", 10) || 0;
    await listMembers(ctx, basket, page);
    return;
  }
  if (id.startsWith("bk_join_")) {
    const basketId = id.replace("bk_join_", "");
    await ensureMember(basketId, ctx.userId, logCtx);
    await replyText(ctx, "Joined the basket successfully.");
    return;
  }
  if (id.startsWith("bk_leave_")) {
    const basketId = id.replace("bk_leave_", "");
    await removeMember(basketId, ctx.userId, logCtx);
    await replyText(ctx, "You have left the basket.");
    return;
  }
  if (id.startsWith("bk_close_")) {
    const basketId = id.replace("bk_close_", "");
    const basket = await fetchBasket(basketId, logCtx);
    if (!basket || basket.creator_id !== ctx.userId) {
      await replyText(ctx, "Only the creator can close this basket.");
      return;
    }
    try {
      await sb.from("baskets").update({ status: "closed" }).eq("id", basketId);
      await replyText(ctx, "Basket closed.");
    } catch (err) {
      logError("BASKET_CLOSE_FAILED", err, { basketId }, logCtx);
      await replyText(ctx, "Could not close basket.");
    }
    return;
  }
  if (id.startsWith("bk_appr_")) {
    const contribId = parseContributionId(id);
    const contrib = await fetchContribution(contribId, logCtx);
    if (!contrib) {
      await replyText(ctx, "Contribution not found.");
      return;
    }
    const basket = await fetchBasket(contrib.basket_id, logCtx);
    if (!basket || basket.creator_id !== ctx.userId) {
      await replyText(ctx, "Only the creator can approve contributions.");
      return;
    }
    await updateContributionStatus(contribId, "approved", ctx.userId, logCtx);
    await incrementMemberTotal(
      contrib.basket_id,
      contrib.contributor_user_id,
      contrib.amount_rwf,
      logCtx,
    );
    await notifyContributor(
      ctx,
      contrib,
      "✅ Contribution approved! Thank you.",
    );
    await replyText(ctx, "Contribution approved.");
    return;
  }
  if (id.startsWith("bk_rej_")) {
    const contribId = parseContributionId(id);
    const contrib = await fetchContribution(contribId, logCtx);
    if (!contrib) {
      await replyText(ctx, "Contribution not found.");
      return;
    }
    const basket = await fetchBasket(contrib.basket_id, logCtx);
    if (!basket || basket.creator_id !== ctx.userId) {
      await replyText(ctx, "Only the creator can reject contributions.");
      return;
    }
    await updateContributionStatus(contribId, "rejected", ctx.userId, logCtx);
    await notifyContributor(
      ctx,
      contrib,
      "❌ Contribution rejected by the basket creator.",
    );
    await replyText(ctx, "Contribution rejected.");
    return;
  }
}

export async function handleBasketTypeButton(
  ctx: ConversationContext,
  id: string,
) {
  if (id === "bk_type_public" || id === "bk_type_private") {
    await handleBasketType(ctx, id);
  }
}

export async function handleJoinToken(ctx: ConversationContext, token: string) {
  const logCtx = ctxFromConversation(ctx);
  if (!token) {
    await replyText(ctx, "Invalid code.");
    return;
  }
  const basket = await fetchBasketByToken(token, logCtx);
  if (!basket) {
    await replyText(ctx, "No basket found for that code.");
    return;
  }
  await ensureMember(basket.id, ctx.userId, logCtx);
  await replyText(ctx, `Joined basket ${basket.name}.`);
  await showBasketActions(ctx, basket);
}
