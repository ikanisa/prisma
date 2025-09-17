import { sendButtons, sendList, sendText } from "../wa/client.ts";
import { ConversationContext } from "../state/types.ts";
import { setState } from "../state/store.ts";
import { safeRowDesc, safeRowTitle } from "../utils/text.ts";
import { e164 } from "../utils/phone.ts";
import {
  fetchBusinessById,
  fetchMarketplaceCategories,
  insertBusiness,
  rpcNearbyBusinesses,
} from "../rpc/marketplace.ts";

interface MarketplaceState {
  mode?: "create" | "discover";
  category_id?: number;
  name?: string;
  description?: string;
  catalog_url?: string | null;
  temp_results?: DiscoverResult[];
}

interface DiscoverResult {
  id: string;
  name: string;
  description: string;
  owner_whatsapp?: string;
  catalog_url?: string | null;
}

function parseCategoryId(id: string): number | null {
  const parts = id.split("_");
  const raw = parts[1] ?? "";
  const num = Number.parseInt(raw, 10);
  return Number.isFinite(num) ? num : null;
}

function toWaDigits(value: string | undefined): string {
  if (!value) return "";
  return e164(value).replace(/\D/g, "");
}

export async function startMarketplace(ctx: ConversationContext) {
  await sendButtons(ctx.phone, "Marketplace options", [
    { id: "mk_add", title: "Create Business" },
    { id: "mk_see", title: "Discover" },
  ]);
  await setState(ctx.userId, "await_market_option", {});
  ctx.state = { key: "await_market_option", data: {} };
}

async function promptCategory(ctx: ConversationContext, mode: "create" | "discover") {
  const categories = await fetchMarketplaceCategories();
  if (!categories.length) {
    await sendText(ctx.phone, "No categories available right now.");
    await setState(ctx.userId, "home", {});
    ctx.state = { key: "home", data: {} };
    return;
  }
  await sendList(ctx.phone, {
    title: "Marketplace Categories",
    body: mode === "create" ? "Pick a category for your business." : "Which category do you want to browse?",
    buttonText: "Choose",
    sectionTitle: "Categories",
    rows: categories.slice(0, 10).map((cat) => ({
      id: `${mode === "create" ? "cat" : "see_cat"}_${cat.id}`,
      title: safeRowTitle(cat.name),
      description: safeRowDesc(""),
    })),
  });
}

export async function handleMarketplaceOption(ctx: ConversationContext, id: string) {
  if (id === "mk_add") {
    await promptCategory(ctx, "create");
    await setState(ctx.userId, "await_market_category", { mode: "create" });
    ctx.state = { key: "await_market_category", data: { mode: "create" } };
    return;
  }
  if (id === "mk_see") {
    await promptCategory(ctx, "discover");
    await setState(ctx.userId, "await_market_see_category", { mode: "discover" });
    ctx.state = { key: "await_market_see_category", data: { mode: "discover" } };
  }
}

export async function handleCreateCategory(ctx: ConversationContext, id: string) {
  const catId = parseCategoryId(id);
  if (!catId) {
    await startMarketplace(ctx);
    return;
  }
  await sendText(ctx.phone, "Send the business name.");
  await setState(ctx.userId, "await_business_name", { category_id: catId });
  ctx.state = { key: "await_business_name", data: { category_id: catId } };
}

export async function handleDiscoverCategory(ctx: ConversationContext, id: string) {
  const catId = parseCategoryId(id);
  if (!catId) {
    await startMarketplace(ctx);
    return;
  }
  await sendText(ctx.phone, "Share your location to discover nearby businesses.");
  await setState(ctx.userId, "await_market_see_loc", { category_id: catId });
  ctx.state = { key: "await_market_see_loc", data: { category_id: catId } };
}

export async function handleBusinessName(ctx: ConversationContext, text: string) {
  const current = ctx.state.data as MarketplaceState | undefined;
  if (!current?.category_id) {
    await startMarketplace(ctx);
    return;
  }
  const data = { ...current, name: text.trim() };
  await sendText(ctx.phone, "Optional: send a short description.");
  await setState(ctx.userId, "await_business_desc", data);
  ctx.state = { key: "await_business_desc", data };
}

export async function handleBusinessDesc(ctx: ConversationContext, text: string) {
  const current = ctx.state.data as MarketplaceState | undefined;
  if (!current?.category_id || !current.name) {
    await startMarketplace(ctx);
    return;
  }
  const data = { ...current, description: text.trim() };
  await sendText(ctx.phone, "Share a catalog URL or tap Skip.");
  await sendButtons(ctx.phone, "Catalog link?", [
    { id: "biz_catalog_skip", title: "Skip" },
  ]);
  await setState(ctx.userId, "await_business_catalog", data);
  ctx.state = { key: "await_business_catalog", data };
}

export async function handleBusinessCatalog(ctx: ConversationContext, text: string) {
  const current = ctx.state.data as MarketplaceState | undefined;
  if (!current?.category_id || !current.name) {
    await startMarketplace(ctx);
    return;
  }
  const normalized = text.trim();
  if (!normalized) {
    await sendText(ctx.phone, "Please send a valid URL or tap Skip.");
    return;
  }
  if (normalized.toLowerCase() === "skip") {
    await handleCatalogSkip(ctx);
    return;
  }
  const data = { ...current, catalog_url: normalized };
  await sendText(ctx.phone, "Share your business location.");
  await setState(ctx.userId, "await_business_location", data);
  ctx.state = { key: "await_business_location", data };
}

export async function handleCatalogSkip(ctx: ConversationContext) {
  const current = ctx.state.data as MarketplaceState | undefined;
  if (!current?.category_id || !current.name) {
    await startMarketplace(ctx);
    return;
  }
  const data = { ...current, catalog_url: null };
  await sendText(ctx.phone, "Share your business location.");
  await setState(ctx.userId, "await_business_location", data);
  ctx.state = { key: "await_business_location", data };
}

export async function handleBusinessLocation(ctx: ConversationContext, lat: number, lon: number) {
  const current = ctx.state.data as MarketplaceState | undefined;
  if (!current?.category_id || !current.name) {
    await startMarketplace(ctx);
    return;
  }

  const geo = `SRID=4326;POINT(${lon} ${lat})`;
  const id = await insertBusiness({
    owner_whatsapp: ctx.phone,
    category_id: current.category_id,
    name: current.name,
    description: current.description ?? null,
    catalog_url: current.catalog_url ?? null,
    geo,
  });

  if (!id) {
    await sendText(ctx.phone, "Could not save business. Try again later.");
    await startMarketplace(ctx);
    return;
  }

  await sendText(ctx.phone, "Business submitted! We'll review it shortly.");
  await setState(ctx.userId, "home", {});
  ctx.state = { key: "home", data: {} };
}

export async function handleDiscoverLocation(ctx: ConversationContext, lat: number, lon: number) {
  const current = ctx.state.data as MarketplaceState | undefined;
  if (!current?.category_id) {
    await startMarketplace(ctx);
    return;
  }

  const rows = await rpcNearbyBusinesses(lat, lon, ctx.phone, 20);
  const filtered = rows.filter((row) => row.category_id === current.category_id);
  if (!filtered.length) {
    await sendText(ctx.phone, "No businesses nearby for that category right now.");
    await setState(ctx.userId, "home", {});
    ctx.state = { key: "home", data: {} };
    return;
  }

  const options: DiscoverResult[] = filtered.slice(0, 10).map((row, index) => ({
    id: row.id,
    name: row.name?.trim() || `Business ${index + 1}`,
    description: row.description?.trim() || "",
    owner_whatsapp: row.owner_whatsapp ?? "",
    catalog_url: row.catalog_url ?? null,
  }));

  await sendList(ctx.phone, {
    title: "Nearby Businesses",
    body: `Found ${options.length} result(s). Choose one for actions.`,
    buttonText: "View",
    sectionTitle: "Businesses",
    rows: options.map((option, index) => ({
      id: `biz_${index}_${option.id}`,
      title: safeRowTitle(option.name),
      description: safeRowDesc(option.description),
    })),
  });

  const nextState: MarketplaceState = { ...current, temp_results: options };
  await setState(ctx.userId, "await_market_see_loc", nextState);
  ctx.state = { key: "await_market_see_loc", data: nextState };
}

export async function handleBusinessAction(ctx: ConversationContext, id: string) {
  if (id.startsWith("biz_")) {
    const parts = id.split("_");
    const idx = Number.parseInt(parts[1] ?? "", 10);
    const bizId = parts[2] ?? "";
    const current = ctx.state.data as MarketplaceState | undefined;
    const option = current?.temp_results?.[idx];
    if (!option || option.id !== bizId) {
      await sendText(ctx.phone, "Business not available now.");
      return;
    }

    await sendButtons(ctx.phone, option.name, [
      { id: `biz_contact_${bizId}`, title: "Contact" },
      { id: `biz_catalog_${bizId}`, title: "View Catalog" },
    ]);
    return;
  }

  if (id.startsWith("biz_contact_")) {
    const bizId = id.replace("biz_contact_", "");
    const business = await fetchBusinessById(bizId);
    const digits = toWaDigits(business?.owner_whatsapp);
    if (!digits) {
      await sendText(ctx.phone, "Contact unavailable.");
      return;
    }
    await sendText(ctx.phone, `Open chat: https://wa.me/${digits}`);
    return;
  }

  if (id.startsWith("biz_catalog_")) {
    const bizId = id.replace("biz_catalog_", "");
    const business = await fetchBusinessById(bizId);
    if (!business?.catalog_url) {
      await sendText(ctx.phone, "No catalog link provided.");
      return;
    }
    await sendText(ctx.phone, business.catalog_url);
  }
}
