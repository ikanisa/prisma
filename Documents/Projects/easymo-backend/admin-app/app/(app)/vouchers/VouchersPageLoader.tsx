"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchVouchers } from "@/lib/api-client";
import { VouchersFilters } from "./VouchersFilters";
import { VouchersTable } from "./VouchersTable";

export function VouchersPageLoader() {
  const searchParams = useSearchParams();
  const params = useMemo(() => {
    const next = new URLSearchParams();
    const q = searchParams.get("q");
    const status = searchParams.get("status");
    const page = searchParams.get("page");
    if (q) next.set("q", q);
    if (status) next.set("status", status);
    if (page) next.set("page", page);
    return next;
  }, [searchParams]);

  const { data, error, isLoading } = useSWR(["vouchers", params.toString()], () => fetchVouchers(params));

  const initialSearch = searchParams.get("q") ?? "";
  const initialStatus = searchParams.get("status") ?? "";

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Vouchers</h1>
      <VouchersFilters initialSearch={initialSearch} initialStatus={initialStatus} />
      {isLoading && <p>Loading vouchers…</p>}
      {error && <p style={{ color: "var(--color-accent-strong)" }}>{String(error)}</p>}
      {data && (
        <VouchersTable rows={data.items} total={data.total} page={data.page} pageSize={data.pageSize} />
      )}
    </section>
  );
}
