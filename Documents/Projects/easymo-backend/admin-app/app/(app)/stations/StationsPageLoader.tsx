"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchStations } from "@/lib/api-client";
import { StationsTable } from "./StationsTable";

export function StationsPageLoader() {
  const searchParams = useSearchParams();
  const params = useMemo(() => {
    const next = new URLSearchParams();
    const q = searchParams.get("q");
    const page = searchParams.get("page");
    if (q) next.set("q", q);
    if (page) next.set("page", page);
    return next;
  }, [searchParams]);

  const { data, error, isLoading } = useSWR(["stations", params.toString()], () => fetchStations(params));

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Stations</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
        {data ? `${data.total} stations (page ${data.page}, source: ${data.source})` : "Fetching stations…"}
      </p>
      {isLoading && <p>Loading stations…</p>}
      {error && <p style={{ color: "var(--color-accent-strong)" }}>{String(error)}</p>}
      {data && <StationsTable rows={data.items} total={data.total} page={data.page} pageSize={data.pageSize} />}
    </section>
  );
}
