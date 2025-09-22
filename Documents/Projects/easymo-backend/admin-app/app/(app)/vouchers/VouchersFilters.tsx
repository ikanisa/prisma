"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "Issued", value: "issued" },
  { label: "Sent", value: "sent" },
  { label: "Redeemed", value: "redeemed" },
  { label: "Expired", value: "expired" },
  { label: "Void", value: "void" },
];

export interface VouchersFiltersProps {
  initialSearch?: string;
  initialStatus?: string;
}

export function VouchersFilters({ initialSearch = "", initialStatus = "" }: VouchersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set("q", search.trim());
    } else {
      params.delete("q");
    }

    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }

    router.push(`/vouchers${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("status");
    router.push(`/vouchers${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const isDirty = useMemo(() => Boolean(search || status), [search, status]);

  return (
    <form onSubmit={handleSubmit} className="voucher-filters" role="search">
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search code or status"
        aria-label="Search vouchers"
      />
      <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button type="submit">Apply</button>
      <button type="button" onClick={clearFilters} disabled={!isDirty}>
        Clear
      </button>
      <style jsx>{`
        .voucher-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        input[type="search"], select {
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          padding: 0.55rem 0.75rem;
          background: var(--color-surface-muted);
        }
        button {
          border-radius: 0.5rem;
          padding: 0.55rem 0.95rem;
          border: 1px solid var(--color-border);
          cursor: pointer;
          background: var(--color-surface);
        }
        button[type="submit"] {
          background: var(--color-accent-soft);
          border-color: transparent;
          color: var(--color-accent-strong);
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
}
