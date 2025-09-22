import { dataService } from "@/lib/data-service";
import type { VoucherRecord } from "@/lib/schemas";

export interface DashboardMetrics {
  activeUsers7d: number;
  activeUsers30d: number;
  issued30d: number;
  sent30d: number;
  delivered30d: number;
  failed30d: number;
  redeemed30d: number;
  redemptionRate: number;
  deliveryRate: number;
  source: {
    users: "supabase" | "mock";
    vouchers: "supabase" | "mock";
    events: "supabase" | "mock";
  };
  recentVouchers: VoucherRecord[];
  timeSeries: Array<{ date: string; issued: number; redeemed: number }>;
  deliverySeries: Array<{ date: string; sent: number; delivered: number; failed: number }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateOnly(value: string) {
  return value.slice(0, 10);
}

function daysBetween(dateIso: string) {
  const date = new Date(dateIso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff / DAY_MS;
}

function aggregateTimeSeries(vouchers: Awaited<ReturnType<typeof dataService.getVouchers>>['data']) {
  const days = 14;
  const series: Array<{ date: string; issued: number; redeemed: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * DAY_MS);
    const dateKey = day.toISOString().slice(0, 10);
    series.push({ date: dateKey, issued: 0, redeemed: 0 });
  }

  const issuedMap = new Map(series.map((entry) => [entry.date, entry]));

  for (const voucher of vouchers) {
    if (voucher.issued_at) {
      const key = toDateOnly(voucher.issued_at);
      const bucket = issuedMap.get(key);
      if (bucket) bucket.issued += 1;
    }
    if (voucher.redeemed_at) {
      const key = toDateOnly(voucher.redeemed_at);
      const bucket = issuedMap.get(key);
      if (bucket) bucket.redeemed += 1;
    }
  }

  return series;
}

const DELIVERY_FAILURE_EVENTS = new Set(["failed", "undelivered", "error", "bounced", "rejected"]);

function aggregateDeliverySeries(events: Awaited<ReturnType<typeof dataService.getVoucherEvents>>['data']) {
  const days = 14;
  const series: Array<{ date: string; sent: number; delivered: number; failed: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * DAY_MS);
    const dateKey = day.toISOString().slice(0, 10);
    series.push({ date: dateKey, sent: 0, delivered: 0, failed: 0 });
  }

  const bucketMap = new Map(series.map((entry) => [entry.date, entry]));

  for (const event of events) {
    const created = event.created_at;
    if (!created) continue;
    const key = toDateOnly(created);
    const bucket = bucketMap.get(key);
    if (!bucket) continue;

    const eventName = (event.event ?? "").toLowerCase();
    if (eventName === "sent") bucket.sent += 1;
    if (eventName === "delivered") bucket.delivered += 1;
    if (DELIVERY_FAILURE_EVENTS.has(eventName)) bucket.failed += 1;
  }

  return series;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [users, vouchers, events] = await Promise.all([
    dataService.getUsers({ pageSize: 500 }),
    dataService.getVouchers({ pageSize: 500 }),
    dataService.getVoucherEvents({ pageSize: 500 }),
  ]);

  const activeUsers7d = new Set(
    vouchers.data
      .filter((voucher) => voucher.user_id && voucher.issued_at && daysBetween(voucher.issued_at) <= 7)
      .map((voucher) => voucher.user_id as string),
  );

  const activeUsers30d = new Set(
    vouchers.data
      .filter((voucher) => voucher.user_id && voucher.issued_at && daysBetween(voucher.issued_at) <= 30)
      .map((voucher) => voucher.user_id as string),
  );

  const issued30d = vouchers.data.filter((voucher) => voucher.issued_at && daysBetween(voucher.issued_at) <= 30).length;
  const redeemed30d = vouchers.data.filter((voucher) => voucher.redeemed_at && daysBetween(voucher.redeemed_at) <= 30).length;

  const sentEvents = events.data.filter((event) => event.event === "sent" && daysBetween(event.created_at ?? "") <= 30);
  const deliveredEvents = events.data.filter((event) => event.event === "delivered" && daysBetween(event.created_at ?? "") <= 30);
  const failedEvents = events.data.filter((event) =>
    DELIVERY_FAILURE_EVENTS.has((event.event ?? "").toLowerCase()) && daysBetween(event.created_at ?? "") <= 30
  );

  const sent30d = sentEvents.length;
  const delivered30d = deliveredEvents.length;
  const failed30d = failedEvents.length;
  const redemptionRate = issued30d === 0 ? 0 : Math.round((redeemed30d / issued30d) * 100);
  const deliveryRate = sent30d === 0 ? 0 : Math.round((delivered30d / sent30d) * 100);

  const timeSeries = aggregateTimeSeries(vouchers.data);
  const deliverySeries = aggregateDeliverySeries(events.data);

  return {
    activeUsers7d: activeUsers7d.size,
    activeUsers30d: activeUsers30d.size,
    issued30d,
    sent30d,
    delivered30d,
    failed30d,
    redeemed30d,
    redemptionRate,
    deliveryRate,
    source: {
      users: users.source,
      vouchers: vouchers.source,
      events: events.source,
    },
    recentVouchers: vouchers.data.slice(0, 200),
    timeSeries,
    deliverySeries,
  };
}
