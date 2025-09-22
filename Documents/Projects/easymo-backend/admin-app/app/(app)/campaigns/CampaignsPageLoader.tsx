"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchCampaigns } from "@/lib/api-client";
import { CampaignsTable } from "./CampaignsTable";

export function CampaignsPageLoader() {
  const searchParams = useSearchParams();
  const params = useMemo(() => {
    const next = new URLSearchParams();
    const q = searchParams.get("q");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const page = searchParams.get("page");
    if (q) next.set("q", q);
    if (status) next.set("status", status);
    if (type) next.set("type", type);
    if (page) next.set("page", page);
    return next;
  }, [searchParams]);

  const { data, error, isLoading } = useSWR(["campaigns", params.toString()], () => fetchCampaigns(params));

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Campaigns</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
        {data ? `${data.total} campaigns (page ${data.page}, source: ${data.source})` : "Fetching campaigns…"}
      </p>
      {isLoading && <p>Loading campaigns…</p>}
      {error && <p style={{ color: "var(--color-accent-strong)" }}>{String(error)}</p>}
      {data && (
        <CampaignsTable rows={data.items} total={data.total} page={data.page} pageSize={data.pageSize} />
      )}
    </section>
  );
}
