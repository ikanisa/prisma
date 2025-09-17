import { ConversationContext } from "../state/types.ts";
import { HOME_MENU_IDS, handleHomeSelection, handleShareButton } from "../flows/home.ts";
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

async function sendFallback(ctx: ConversationContext) {
  await sendButtons(ctx.phone, "I didn't catch that. Want to open the home menu?", [
    { id: "back_home", title: safeButtonTitle("Back to Menu") },
  ]);
}

export async function route(ctx: ConversationContext): Promise<boolean> {
  const { message } = ctx;

  // 1) Insurance media first
  if ((message?.type === "image" && message.image) || (message?.type === "document" && message.document)) {
    if (ctx.state.key === "ins_wait_doc") {
      await handleInsuranceMedia(ctx, message);
      return true;
    }
  }

  const interactive = message?.interactive;

  // 2) List replies
  if (interactive?.type === "list_reply") {
    const id = interactive.list_reply?.id ?? "";
    if (!id) {
      await sendFallback(ctx);
      return true;
    }

    if (HOME_MENU_IDS.includes(id)) {
      await handleHomeSelection(ctx.phone, id);
      return true;
    }
    if (id === "motor_insurance") {
      await startInsurance(ctx);
      return true;
    }
    if (id === "marketplace") {
      await startMarketplace(ctx);
      return true;
    }
    if (id === "momoqr_start") {
      await startMomoQr(ctx);
      return true;
    }
    if (id === "baskets") {
      await startBaskets(ctx);
      return true;
    }
    if (id === "see_drivers") {
      await startNearbyDrivers(ctx);
      return true;
    }
    if (id === "see_passengers") {
      await startNearbyPassengers(ctx);
      return true;
    }
    if (id === "schedule_trip") {
      await startSchedule(ctx);
      return true;
    }
    if (id.startsWith("cat_")) {
      await handleCreateCategory(ctx, id);
      return true;
    }
    if (id.startsWith("see_cat_")) {
      await handleDiscoverCategory(ctx, id);
      return true;
    }
    if (id.startsWith("near_v_drv_")) {
      await handleDriverVehicleChoice(ctx, id);
      return true;
    }
    if (id.startsWith("near_v_pax_")) {
      await handlePassengerVehicleChoice(ctx, id);
      return true;
    }
    if (id.startsWith("veh_")) {
      await handleVehicleChoice(ctx, id);
      return true;
    }
    if (id.startsWith("biz_")) {
      await handleBusinessAction(ctx, id);
      return true;
    }
    if (id.startsWith("drv_")) {
      await handleDriverSelection(ctx, id);
      return true;
    }
    if (id.startsWith("pax_")) {
      await handlePassengerSelection(ctx, id);
      return true;
    }
    if (id.startsWith("mtch_")) {
      await handleMatchSelection(ctx, id);
      return true;
    }
    if (id.startsWith("mqr_")) {
      await handleMomoQrList(ctx, id);
      return true;
    }
    if (id.startsWith("b_") || id === "bk_new" || id === "bk_join_code") {
      await handleBasketListSelection(ctx, id);
      return true;
    }
    if (ctx.state.key === "await_schedule_role" && (id === "role_passenger" || id === "role_driver")) {
      await handleRoleChoice(ctx, id);
      return true;
    }
  }

  // 3) Button replies
  if (interactive?.type === "button_reply") {
    const id = interactive.button_reply?.id ?? "";
    if (!id) {
      await sendFallback(ctx);
      return true;
    }

    if (id === "share_link" || id === "share_qr") {
      await handleShareButton(ctx.phone, id);
      return true;
    }
    if (id === "mk_add" || id === "mk_see") {
      await handleMarketplaceOption(ctx, id);
      return true;
    }
    if (id.startsWith("mqr_")) {
      await handleMomoQrButton(ctx, id);
      return true;
    }
    if (id === "bk_type_public" || id === "bk_type_private") {
      await handleBasketTypeButton(ctx, id);
      return true;
    }
    if (id.startsWith("bk_")) {
      await handleBasketButton(ctx, id);
      return true;
    }
    if (id.startsWith("sched_add_drop_")) {
      const tripId = id.replace("sched_add_drop_", "");
      await handleAddDropButton(ctx, tripId);
      return true;
    }
    if (id.startsWith("sched_skip_drop_")) {
      const tripId = id.replace("sched_skip_drop_", "");
      await handleSkipDrop(ctx, tripId);
      return true;
    }
    if (id === "biz_catalog_skip") {
      await handleCatalogSkip(ctx);
      return true;
    }
    if (id.startsWith("biz_contact_") || id.startsWith("biz_catalog_")) {
      await handleBusinessAction(ctx, id);
      return true;
    }
  }

  // 4) Location events
  if (message?.type === "location" && message.location) {
    const { latitude, longitude } = message.location;
    if (typeof latitude === "number" && typeof longitude === "number") {
      if (ctx.state.key === "near_await_loc_drivers") {
        await handleDriverLocation(ctx, latitude, longitude);
        return true;
      }
      if (ctx.state.key === "near_await_loc_passengers") {
        await handlePassengerLocation(ctx, latitude, longitude);
        return true;
      }
      if (ctx.state.key === "await_schedule_pickup") {
        await handlePickupLocation(ctx, latitude, longitude);
        return true;
      }
      if (ctx.state.key === "sched_await_drop") {
        await handleDropLocation(ctx, latitude, longitude);
        return true;
      }
      if (ctx.state.key === "await_business_location") {
        await handleBusinessLocation(ctx, latitude, longitude);
        return true;
      }
      if (ctx.state.key === "await_market_see_loc") {
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
        return true;
      }
      if (await handleMomoQrText(ctx, text)) {
        return true;
      }
      if (await handleInsuranceText(ctx, text)) {
        return true;
      }
      switch (ctx.state.key) {
        case "await_business_name":
          await handleBusinessName(ctx, text);
          return true;
        case "await_business_desc":
          await handleBusinessDesc(ctx, text);
          return true;
        case "await_business_catalog":
          await handleBusinessCatalog(ctx, text);
          return true;
        default:
          break;
      }
    }
  }

  // 6) Fallback if nothing handled
  await sendFallback(ctx);
  return true;
}
