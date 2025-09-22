"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import type { StationRecord } from "@/lib/schemas";

interface StationsTableProps {
  rows: StationRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const columns: DataTableColumn<StationRecord>[] = [
  { key: "name", header: "Station", width: 240 },
  { key: "engen_code", header: "Code", width: 140 },
  { key: "contact_name", header: "Contact", width: 160 },
  { key: "contact_phone", header: "Phone", width: 160 },
  {
    key: "updated_at",
    header: "Updated",
    render: (value) => (typeof value === "string" ? new Date(value).toLocaleString() : "—"),
  },
];

export function StationsTable({ rows, total, page, pageSize }: StationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    router.push(`/stations${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <DataTable
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      csvFilename="stations.csv"
      searchPlaceholder="Search station or code"
    />
  );
}
