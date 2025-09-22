import { getDashboardMetrics } from "@/lib/dashboard-metrics";
import { DashboardChart } from "@/components/DashboardChart";
import { RecentVouchersTable } from "./RecentVouchersTable";

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export default async function Page() {
  const metrics = await getDashboardMetrics();

  const cards = [
    {
      label: "Active users (7d)",
      value: formatNumber(metrics.activeUsers7d),
      hint: "unique recipients engaging in the last 7 days",
    },
    {
      label: "Active users (30d)",
      value: formatNumber(metrics.activeUsers30d),
      hint: "users with at least one voucher issued",
    },
    {
      label: "Vouchers issued (30d)",
      value: formatNumber(metrics.issued30d),
      hint: "generated across all campaigns",
    },
    {
      label: "Vouchers sent (30d)",
      value: formatNumber(metrics.sent30d),
      hint: "WhatsApp send attempts",
    },
    {
      label: "Delivered (30d)",
      value: formatNumber(metrics.delivered30d),
      hint: "WhatsApp delivery confirmations",
    },
    {
      label: "Vouchers redeemed (30d)",
      value: formatNumber(metrics.redeemed30d),
      hint: "completed redemptions",
    },
    {
      label: "Redemption rate",
      value: `${metrics.redemptionRate}%`,
      hint: "redeemed / issued",
    },
    {
      label: "Delivery rate",
      value: `${metrics.deliveryRate}%`,
      hint: "WhatsApp delivered / sent",
    },
    {
      label: "Delivery failures (30d)",
      value: formatNumber(metrics.failed30d),
      hint: "WhatsApp errors or undelivered events",
    },
  ];

  const sourceSet = new Set(Object.values(metrics.source));
  const sourceLabel = sourceSet.size === 1
    ? `Data source: ${sourceSet.values().next().value}`
    : `Data sources — users: ${metrics.source.users}, vouchers: ${metrics.source.vouchers}, events: ${metrics.source.events}`;

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        Metrics are derived from recent voucher activity. When Supabase credentials are absent the mock dataset powers the
        figures so the UI stays functional.
      </p>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{sourceLabel}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        {cards.map((item) => (
          <article
            key={item.label}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.9rem",
              padding: "1.25rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-muted)" }}>{item.label}</p>
            <p style={{ margin: "0.35rem 0", fontSize: "2rem", fontWeight: 600 }}>{item.value}</p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{item.hint}</p>
          </article>
        ))}
      </div>

      <div style={{ marginTop: "2.5rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Issued vs redeemed (last 14 days)</h2>
        <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
          Solid line shows vouchers issued each day; green line reflects redemptions. Hover for tooltips (system tooltip via
          your browser).
        </p>
        <div style={{ marginTop: "1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "1rem", padding: "1rem" }}>
          <DashboardChart
            ariaLabel="Daily vouchers issued versus redeemed"
            data={metrics.timeSeries}
            series={[
              { key: "issued", label: "Issued", color: "var(--color-accent-strong)" },
              { key: "redeemed", label: "Redeemed", color: "#10b981" },
            ]}
          />
        </div>
      </div>

      <div style={{ marginTop: "2.5rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>WhatsApp delivery (last 14 days)</h2>
        <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
          Visualises outbound voucher sends, confirmed deliveries, and failures. Failures aggregate WhatsApp error/undelivered
          events.
        </p>
        <div style={{ marginTop: "1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "1rem", padding: "1rem" }}>
          <DashboardChart
            ariaLabel="Daily WhatsApp delivery events"
            data={metrics.deliverySeries}
            series={[
              { key: "sent", label: "Sent", color: "var(--color-accent-strong)" },
              { key: "delivered", label: "Delivered", color: "#10b981" },
              { key: "failed", label: "Failed", color: "#ef4444" },
            ]}
          />
        </div>
      </div>

      <div style={{ marginTop: "2.5rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Recent vouchers</h2>
        <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
          Showing the latest {Math.min(metrics.recentVouchers.length, 50)} rows from the current dataset.
        </p>
        <RecentVouchersTable rows={metrics.recentVouchers.slice(0, 200)} />
      </div>
    </section>
  );
}
