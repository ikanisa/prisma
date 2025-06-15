
/**
 * Formats a number string to currency with spaces as thousand separators.
 * E.g., "12345678" => "12 345 678"
 */
export function formatCurrencyWithSpaces(value: string): string {
  // Remove all non-digits (allows only digits)
  const numeric = value.replace(/\D/g, "");
  if (!numeric) return "";
  // Add spaces as thousand separators
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Converts a formatted string back to a plain numeric string.
 */
export function unformatCurrencyWithSpaces(value: string): string {
  return value.replace(/\s+/g, "");
}
