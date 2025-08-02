
export type CachedQR = {
  phone: string;
  amount: string;
  ussdString: string;
  qrDataUrl?: string;
  timestamp: number;
};

export type CachedBanner = {
  headline: string;
  description: string;
  gradient: string[];
  ctaLink: string;
  imageUrl: string;
};

const KEY_PHONES = "mmpwa_recentPhones";
const KEY_AMOUNTS = "mmpwa_recentAmounts";
const KEY_QR = "mmpwa_qrHistory";
const KEY_BANNERS = "mmpwa_banners";
const KEY_QUEUE = "mmpwa_offlineQueue";
const MAX_PHONES = 3, MAX_AMOUNTS = 3, MAX_QRS = 5, MAX_BANNERS = 3;

export function isSimulateOffline() {
  return localStorage.getItem("mmpwa_simulateOffline") === "true";
}

function getList<T>(key: string, max: number): T[] {
  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  return Array.isArray(arr) ? arr.slice(0, max) : [];
}
function setList<T>(key: string, arr: T[], max: number) {
  localStorage.setItem(key, JSON.stringify(arr.slice(0, max)));
}

export function addPhone(phone: string) {
  if (!phone) return;
  let arr: string[] = getList(KEY_PHONES, MAX_PHONES);
  arr = [phone, ...arr.filter(p => p !== phone)];
  setList(KEY_PHONES, arr, MAX_PHONES);
}
export function getRecentPhones(): string[] {
  return getList(KEY_PHONES, MAX_PHONES);
}

export function addAmount(amount: string) {
  if (!amount) return;
  let arr: string[] = getList(KEY_AMOUNTS, MAX_AMOUNTS);
  arr = [amount, ...arr.filter(a => a !== amount)];
  setList(KEY_AMOUNTS, arr, MAX_AMOUNTS);
}
export function getRecentAmounts(): string[] {
  return getList(KEY_AMOUNTS, MAX_AMOUNTS);
}

export function addQRCode(qr: CachedQR) {
  let arr: CachedQR[] = getList(KEY_QR, MAX_QRS);
  arr = [qr, ...arr.filter(q => q.ussdString !== qr.ussdString)];
  setList(KEY_QR, arr, MAX_QRS);
}
export function getRecentQRCodes(): CachedQR[] {
  return getList(KEY_QR, MAX_QRS);
}

// Banners
export function setBannerCache(list: CachedBanner[]) {
  setList(KEY_BANNERS, list, MAX_BANNERS);
}
export function getBannerCache(): CachedBanner[] {
  return getList(KEY_BANNERS, MAX_BANNERS);
}

// Offline action queue for later sync (QR/logs)
export type OfflineAction = { type: "qr"|"scan"|"log"; data: any; };
export function addToOfflineQueue(action: OfflineAction) {
  let arr: OfflineAction[] = getList(KEY_QUEUE, 10);
  arr = [...arr, action];
  setList(KEY_QUEUE, arr, 10);
}
export function getOfflineQueue(): OfflineAction[] {
  return getList(KEY_QUEUE, 10);
}
export function clearOfflineQueue() {
  localStorage.removeItem(KEY_QUEUE);
}
