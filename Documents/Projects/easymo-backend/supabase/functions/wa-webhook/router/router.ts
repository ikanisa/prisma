import { ConversationContext } from "../state/types.ts";
import {
  handleHomeSelection,
  handleShareButton,
  HOME_MENU_IDS,
} from "../flows/home.ts";
import {
  handleDriverLocation,
  handleDriverSelection,
  handleDriverVehicleChoice,
  handlePassengerLocation,
  handlePassengerSelection,
  handlePassengerVehicleChoice,
  startNearbyDrivers,
  startNearbyPassengers,
} from "../flows/nearby.ts";
import {
  handleAddDropButton,
  handleDropLocation,
  handleMatchSelection,
  handlePickupLocation,
  handleRoleChoice,
  handleSkipDrop,
  handleVehicleChoice,
  startSchedule,
} from "../flows/schedule.ts";
import {
  handleBusinessAction,
  handleBusinessCatalog,
  handleBusinessDesc,
  handleBusinessLocation,
  handleBusinessName,
  handleCatalogSkip,
  handleCreateCategory,
  handleDiscoverCategory,
  handleDiscoverLocation,
  handleMarketplaceOption,
  startMarketplace,
} from "../flows/marketplace.ts";
import {
  handleBasketButton,
  handleBasketListSelection,
  handleBasketText,
  handleBasketTypeButton,
  startBaskets,
} from "../flows/basket.ts";
import {
  handleMomoQrButton,
  handleMomoQrList,
  handleMomoQrText,
  startMomoQr,
} from "../flows/qr.ts";
import {
  handleInsuranceMedia,
  handleInsuranceText,
  startInsurance,
} from "../flows/insurance.ts";
import { safeButtonTitle } from "../utils/text.ts";
import { sendButtons } from "../wa/client.ts";
import { ctxFromConversation, logInfo, logWarn } from "../utils/logger.ts";

async function sendFallback(ctx: ConversationContext) {
  await sendButtons(
    ctx.phone,
    "I didn't catch that. Want to open the home menu?",
    [
      { id: "back_home", title: safeButtonTitle("Back to Menu") },
    ],
    ctxFromConversation(ctx),
  );
}

export async function route(ctx: ConversationContext): Promise<boolean> {
  const { message } = ctx;
  const logCtx = {
    requestId: ctx.requestId,
    userId: ctx.userId,
    phone: ctx.phone,
  };
  const logRoute = (flow: string, extra: Record<string, unknown> = {}) => {
    logInfo("ROUTE", { flow, ...extra }, logCtx);
  };

  // 1) Insurance media first
  if (
    (message?.type === "image" && message.image) ||
    (message?.type === "document" && message.document)
  ) {
    if (ctx.state.key === "ins_wait_doc") {
      logRoute("insurance_media", { messageType: message.type });
      await handleInsuranceMedia(ctx, message);
      return true;
    }
  }

  const interactive = message?.interactive;

  // 2) List replies
  if (interactive?.type === "list_reply") {
    const id = interactive.list_reply?.id ?? "";
    if (!id) {
      logWarn("ROUTE_FALLBACK", { reason: "empty_list_id" }, logCtx);
      await sendFallback(ctx);
      return true;
    }

    if (id === "motor_insurance") {
      logRoute("insurance_start", {});
      await startInsurance(ctx);
      return true;
    }
    if (id === "marketplace") {
      logRoute("marketplace_start", {});
      await startMarketplace(ctx);
      return true;
    }
    if (id === "momoqr_start") {
      logRoute("momo_qr_start", {});
      await startMomoQr(ctx);
      return true;
    }
    if (id === "baskets") {
      logRoute("baskets_start", {});
      await startBaskets(ctx);
      return true;
    }
    if (id === "see_drivers") {
      logRoute("nearby_drivers_start", {});
      await startNearbyDrivers(ctx);
      return true;
    }
    if (id === "see_passengers") {
      logRoute("nearby_passengers_start", {});
      await startNearbyPassengers(ctx);
      return true;
    }
    if (id === "schedule_trip") {
      logRoute("schedule_start", {});
      await startSchedule(ctx);
      return true;
    }
    if (id.startsWith("cat_")) {
      logRoute("marketplace_create_category", { selection: id });
      await handleCreateCategory(ctx, id);
      return true;
    }
    if (id.startsWith("see_cat_")) {
      logRoute("marketplace_discover_category", { selection: id });
      await handleDiscoverCategory(ctx, id);
      return true;
    }
    if (id.startsWith("near_v_drv_")) {
      logRoute("nearby_drivers_vehicle", { selection: id });
      await handleDriverVehicleChoice(ctx, id);
      return true;
    }
    if (id.startsWith("near_v_pax_")) {
      logRoute("nearby_passengers_vehicle", { selection: id });
      await handlePassengerVehicleChoice(ctx, id);
      return true;
    }
    if (id.startsWith("veh_")) {
      logRoute("schedule_vehicle", { selection: id });
      await handleVehicleChoice(ctx, id);
      return true;
    }
    if (id.startsWith("biz_")) {
      logRoute("marketplace_list_action", { selection: id });
      await handleBusinessAction(ctx, id);
      return true;
    }
    if (id.startsWith("drv_")) {
      logRoute("nearby_driver_select", { selection: id });
      await handleDriverSelection(ctx, id);
      return true;
    }
    if (id.startsWith("pax_")) {
      logRoute("nearby_passenger_select", { selection: id });
      await handlePassengerSelection(ctx, id);
      return true;
    }
    if (id.startsWith("mtch_")) {
      logRoute("schedule_match_select", { selection: id });
      await handleMatchSelection(ctx, id);
      return true;
    }
    if (id.startsWith("mqr_")) {
      logRoute("momo_qr_list", { selection: id });
      await handleMomoQrList(ctx, id);
      return true;
    }
    if (id.startsWith("b_") || id === "bk_new" || id === "bk_join_code") {
      logRoute("baskets_list", { selection: id });
      await handleBasketListSelection(ctx, id);
      return true;
    }
    if (
      ctx.state.key === "await_schedule_role" &&
      (id === "role_passenger" || id === "role_driver")
    ) {
      logRoute("schedule_role", { selection: id });
      await handleRoleChoice(ctx, id);
      return true;
    }
    if (HOME_MENU_IDS.includes(id)) {
      logRoute("home_menu", { selection: id });
      await handleHomeSelection(ctx, id);
      return true;
    }
  }

  // 3) Button replies
  if (interactive?.type === "button_reply") {
    const id = interactive.button_reply?.id ?? "";
    if (!id) {
      logWarn("ROUTE_FALLBACK", { reason: "empty_button_id" }, logCtx);
      await sendFallback(ctx);
      return true;
    }

    if (id === "share_link" || id === "share_qr") {
      logRoute("home_share", { selection: id });
      await handleShareButton(ctx, id);
      return true;
    }
    if (id === "mk_add" || id === "mk_see") {
      logRoute("marketplace_option", { selection: id });
      await handleMarketplaceOption(ctx, id);
      return true;
    }
    if (id.startsWith("mqr_")) {
      logRoute("momo_qr_button", { selection: id });
      await handleMomoQrButton(ctx, id);
      return true;
    }
    if (id === "bk_type_public" || id === "bk_type_private") {
      logRoute("baskets_type", { selection: id });
      await handleBasketTypeButton(ctx, id);
      return true;
    }
    if (id.startsWith("bk_")) {
      logRoute("baskets_action", { selection: id });
      await handleBasketButton(ctx, id);
      return true;
    }
    if (id.startsWith("sched_add_drop_")) {
      const tripId = id.replace("sched_add_drop_", "");
      logRoute("schedule_add_drop", { tripId });
      await handleAddDropButton(ctx, tripId);
      return true;
    }
    if (id.startsWith("sched_skip_drop_")) {
      const tripId = id.replace("sched_skip_drop_", "");
      logRoute("schedule_skip_drop", { tripId });
      await handleSkipDrop(ctx, tripId);
      return true;
    }
    if (id === "biz_catalog_skip") {
      logRoute("marketplace_catalog_skip", {});
      await handleCatalogSkip(ctx);
      return true;
    }
    if (id.startsWith("biz_contact_") || id.startsWith("biz_catalog_")) {
      logRoute("marketplace_action_button", { selection: id });
      await handleBusinessAction(ctx, id);
      return true;
    }
  }

  // 4) Location events
  if (message?.type === "location" && message.location) {
    const { latitude, longitude } = message.location;
    if (typeof latitude === "number" && typeof longitude === "number") {
      if (ctx.state.key === "near_await_loc_drivers") {
        logRoute("nearby_drivers_location", {});
        await handleDriverLocation(ctx, latitude, longitude);
        return true;
      }
      if (ctx.state.key === "near_await_loc_passengers") {
        logRoute("nearby_passengers_location", {});
        await handlePassengerLocation(ctx, latitude, longitude);
        return true;
      }
      if (ctx.state.key === "await_schedule_pickup") {
        logRoute("schedule_pickup_location", {});
        await handlePickupLocation(ctx, latitude, longitude);
        return true;
      }
      if (ctx.state.key === "sched_await_drop") {
        logRoute("schedule_drop_location", {});
        await handleDropLocation(ctx, latitude, longitude);
        return true;
      }
      if (ctx.state.key === "await_business_location") {
        logRoute("marketplace_business_location", {});
        await handleBusinessLocation(ctx, latitude, longitude);
        return true;
      }
      if (ctx.state.key === "await_market_see_loc") {
        logRoute("marketplace_discover_location", {});
        await handleDiscoverLocation(ctx, latitude, longitude);
        return true;
      }
    }
  }

  // 5) Text handling (after other message types)
  if (message?.type === "text") {
    const text = (message.text?.body ?? "").trim();
    if (text) {
      if (await handleBasketText(ctx, text)) {
        logRoute("baskets_text", { state: ctx.state.key });
        return true;
      }
      if (await handleMomoQrText(ctx, text)) {
        logRoute("momo_qr_text", { state: ctx.state.key });
        return true;
      }
      if (await handleInsuranceText(ctx, text)) {
        logRoute("insurance_text", { state: ctx.state.key });
        return true;
      }
      switch (ctx.state.key) {
        case "await_business_name":
          logRoute("marketplace_business_name", {});
          await handleBusinessName(ctx, text);
          return true;
        case "await_business_desc":
          logRoute("marketplace_business_desc", {});
          await handleBusinessDesc(ctx, text);
          return true;
        case "await_business_catalog":
          logRoute("marketplace_business_catalog", {});
          await handleBusinessCatalog(ctx, text);
          return true;
        default:
          break;
      }
    }
  }

  // 6) Fallback if nothing handled
  logWarn("ROUTE_FALLBACK", { state: ctx.state.key }, logCtx);
  await sendFallback(ctx);
  return true;
}
