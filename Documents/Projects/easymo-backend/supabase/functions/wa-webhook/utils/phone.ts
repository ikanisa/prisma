export function e164(input: string): string {
  const value = (input ?? "").trim();
  if (!value) return "";
  if (value.startsWith("+")) return value;
  if (value.startsWith("250")) return `+${value}`;
  if (value.startsWith("0250")) return `+${value.slice(1)}`;
  if (value.startsWith("0") && value[1] === "7") return `+250${value.slice(1)}`;
  return `+${value}`;
}

export function to07FromE164(input: string): string {
  const normalized = e164(input);
  const digits = normalized.replace(/\D/g, "");
  if (digits.startsWith("2507")) return `0${digits.slice(3)}`;
  if (digits.startsWith("07")) return digits;
  return digits;
}
