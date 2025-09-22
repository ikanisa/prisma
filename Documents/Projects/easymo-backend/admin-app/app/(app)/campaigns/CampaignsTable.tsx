"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import type { CampaignRecord } from "@/lib/schemas";

interface CampaignsTableProps {
  rows: CampaignRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const columns: DataTableColumn<CampaignRecord>[] = [
  { key: "name", header: "Campaign", width: 220 },
  { key: "type", header: "Type", width: 120 },
  { key: "status", header: "Status", width: 140 },
  {
    key: "created_at",
    header: "Created",
    render: (value) => (typeof value === "string" ? new Date(value).toLocaleDateString() : "—"),
  },
  {
    key: "updated_at",
    header: "Updated",
    render: (value) => (typeof value === "string" ? new Date(value).toLocaleString() : "—"),
  },
];

export function CampaignsTable({ rows, total, page, pageSize }: CampaignsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(next));
    }
    router.push(`/campaigns${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <DataTable
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      csvFilename="campaigns.csv"
      searchPlaceholder="Search campaigns"
    />
  );
}
