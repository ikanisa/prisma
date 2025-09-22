"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchInsuranceQuotes } from "@/lib/api-client";
import { InsuranceTable } from "./InsuranceTable";

export function InsurancePageLoader() {
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

  const { data, error, isLoading } = useSWR(["insurance", params.toString()], () => fetchInsuranceQuotes(params));

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Insurance Queue</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
        {data ? `${data.total} quotes (page ${data.page}, source: ${data.source})` : "Fetching insurance quotes…"}
      </p>
      {isLoading && <p>Loading quotes…</p>}
      {error && <p style={{ color: "var(--color-accent-strong)" }}>{String(error)}</p>}
      {data && <InsuranceTable rows={data.items} total={data.total} page={data.page} pageSize={data.pageSize} />}
    </section>
  );
}
