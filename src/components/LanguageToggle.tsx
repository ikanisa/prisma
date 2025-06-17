
import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { getLocale, setLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import CountryFlag from "./CountryFlag";

// Only ISO codes for country flags
const LANGUAGE_FLAGS: Record<string, "en" | "rw" | "fr"> = {
  en: "en",
  rw: "rw",
  fr: "fr",
};

// Temporarily locked to English only
const SUPPORTED_LANGUAGES = [
  { code: "en" },
  // { code: "rw" },
  // { code: "fr" },
  // Extend here for more when ready
];

const LanguageToggle: React.FC = () => {
  // Hide the component completely
  return null;
};

export default LanguageToggle;
