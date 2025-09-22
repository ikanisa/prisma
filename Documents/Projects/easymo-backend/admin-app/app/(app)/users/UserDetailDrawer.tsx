"use client";

import { useEffect } from "react";
import type { UserRecord, VoucherRecord, InsuranceQuoteRecord } from "@/lib/schemas";
import { SimpleTable, type Column } from "@/components/SimpleTable";

interface UserDetailData {
  user: UserRecord;
  vouchers: VoucherRecord[];
  quotes: InsuranceQuoteRecord[];
  source: {
    user: "supabase" | "mock";
    vouchers: "supabase" | "mock";
    quotes: "supabase" | "mock";
  };
}

interface UserDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error?: Error;
  data?: UserDetailData;
}

const voucherColumns: Column<VoucherRecord>[] = [
  { key: "code", header: "Code" },
  { key: "status", header: "Status" },
  {
    key: "issued_at",
    header: "Issued",
    render: (value) => (typeof value === "string" && value ? new Date(value).toLocaleString() : "—"),
  },
  {
    key: "redeemed_at",
    header: "Redeemed",
    render: (value) => (typeof value === "string" && value ? new Date(value).toLocaleString() : "—"),
  },
];

const quoteColumns: Column<InsuranceQuoteRecord>[] = [
  { key: "vehicle_plate", header: "Plate" },
  { key: "status", header: "Status" },
  {
    key: "premium",
    header: "Premium",
    render: (value) => (typeof value === "number" ? value.toLocaleString() : "—"),
  },
  {
    key: "submitted_at",
    header: "Submitted",
    render: (value) => (typeof value === "string" && value ? new Date(value).toLocaleString() : "—"),
  },
];

export function UserDetailDrawer({ open, onClose, loading, error, data }: UserDetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const user = data?.user;

  return (
    <div className="drawer__backdrop" role="presentation" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer__header">
          <div>
            <h2 id="user-detail-title" style={{ margin: 0 }}>
              {user?.display_name || user?.msisdn_e164 || "User detail"}
            </h2>
            {user?.msisdn_e164 && (
              <p style={{ margin: 0, color: "var(--color-text-muted)" }}>{user.msisdn_e164}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="drawer__close" aria-label="Close user detail">
            ×
          </button>
        </div>

        {loading && <p style={{ color: "var(--color-text-muted)" }}>Loading user context…</p>}
        {error && <p style={{ color: "var(--color-accent-strong)" }}>{error.message}</p>}

        {user && !loading && !error && (
          <div className="drawer__content">
            <section>
              <h3>User summary</h3>
              <dl className="drawer__definition">
                <div>
                  <dt>Status</dt>
                  <dd>{user.status ?? "—"}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{user.created_at ? new Date(user.created_at).toLocaleString() : "—"}</dd>
                </div>
                <div>
                  <dt>Total vouchers</dt>
                  <dd>{typeof user.total_vouchers === "number" ? user.total_vouchers : "—"}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3>Recent vouchers</h3>
              <SimpleTable
                columns={voucherColumns}
                rows={data?.vouchers.slice(0, 20) ?? []}
                emptyLabel="No vouchers for this user yet."
              />
              <p className="drawer__footnote">Source: {data?.source.vouchers ?? "—"}</p>
            </section>

            <section>
              <h3>Insurance quotes</h3>
              <SimpleTable
                columns={quoteColumns}
                rows={data?.quotes.slice(0, 20) ?? []}
                emptyLabel="No insurance submissions linked to this user."
              />
              <p className="drawer__footnote">Source: {data?.source.quotes ?? "—"}</p>
            </section>

            <section>
              <h3>Data provenance</h3>
              <ul className="drawer__footnotes">
                <li>Users: {data?.source.user ?? "—"}</li>
                <li>Vouchers: {data?.source.vouchers ?? "—"}</li>
                <li>Quotes: {data?.source.quotes ?? "—"}</li>
              </ul>
            </section>
          </div>
        )}
      </aside>
      <style jsx>{`
        .drawer__backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          justify-content: flex-end;
          z-index: 50;
        }
        .drawer {
          width: min(420px, 100vw);
          height: 100%;
          background: var(--color-surface);
          border-left: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          gap: 1.5rem;
          overflow-y: auto;
        }
        .drawer__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        .drawer__close {
          border: none;
          background: transparent;
          font-size: 1.5rem;
          cursor: pointer;
          line-height: 1;
        }
        .drawer__content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .drawer__definition {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
        }
        .drawer__definition dt {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin-bottom: 0.25rem;
        }
        .drawer__definition dd {
          margin: 0;
        }
        .drawer__footnote {
          margin-top: 0.5rem;
          color: var(--color-text-muted);
          font-size: 0.8rem;
        }
        .drawer__footnotes {
          margin: 0;
          padding-left: 1.1rem;
          color: var(--color-text-muted);
          font-size: 0.85rem;
        }
        h3 {
          margin: 0 0 0.5rem;
        }
      `}</style>
    </div>
  );
}
