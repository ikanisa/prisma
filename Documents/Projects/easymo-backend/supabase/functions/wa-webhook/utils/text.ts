export function safeRowTitle(value: string, max = 24): string {
  if (!value) return "";
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function safeRowDesc(value: string, max = 72): string {
  if (!value) return "";
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function safeButtonTitle(value: string, max = 20): string {
  if (!value) return "";
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function fmtKm(distance: number | string | null | undefined): string {
  if (distance == null) return "";
  const n = typeof distance === "string" ? Number.parseFloat(distance) : distance;
  if (!Number.isFinite(n)) return "";
  if (n < 1) return `${Math.round(n * 1000)} m`;
  return `${Math.round(n * 10) / 10} km`;
}

export function timeAgo(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return "";
  const timestamp = Date.parse(isoTimestamp);
  if (Number.isNaN(timestamp)) return "";
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
