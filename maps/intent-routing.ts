/**
 * Intent-to-template routing map for easyMO.
 * Determines which WhatsApp template ID (and optional button intents)
 * to use based on user intent.
 */
import { WA_TPL } from "@easymo/wa-utils";

export const INTENT_ROUTING: Record<
  string,
  {
    template?: keyof typeof WA_TPL;
    buttonIntent?: string;
  }
> = {
  // New user welcome
  first_time_sender: { template: WA_TPL.tpl_welcome_quick_v1 },

  // Payments
  PAY_*: { template: WA_TPL.tpl_payments_quick_v1 },

  // Partner & drivers
  PARTNER_DRV: { template: WA_TPL.tpl_partner_quick_v1 },

  // Vehicle searches/listings
  VEHICLE_LIST: { buttonIntent: "vehicle_search" },
  SEARCH_VEHICLE: { buttonIntent: "vehicle_search" },

  // Property searches/listings
  PROPERTY_LIST: { buttonIntent: "property_search" },
  SEARCH_PROPERTY: { buttonIntent: "property_search" },

  // Fallback: will render free text + dynamic buttons
  DEFAULT: {},
};
