import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Re-export from new domain structure for backward compatibility
export * from "@/domains/shared/formatting"
export * from "@/domains/shared/utils"
export * from "@/domains/shared/validation"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}