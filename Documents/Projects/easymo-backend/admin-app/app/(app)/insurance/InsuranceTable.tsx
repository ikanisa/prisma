"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import type { InsuranceQuoteRecord } from "@/lib/schemas";

interface InsuranceTableProps {
  rows: InsuranceQuoteRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const columns: DataTableColumn<InsuranceQuoteRecord>[] = [
  { key: "vehicle_plate", header: "Vehicle", width: 160 },
  { key: "status", header: "Status", width: 140 },
  {
    key: "premium",
    header: "Premium",
    width: 140,
    render: (value) => (typeof value === "number" ? `${value.toLocaleString()} RWF` : "—"),
  },
  {
    key: "submitted_at",
    header: "Submitted",
    render: (value) => (typeof value === "string" ? new Date(value).toLocaleString() : "—"),
  },
];

export function InsuranceTable({ rows, total, page, pageSize }: InsuranceTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    router.push(`/insurance${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <DataTable
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      csvFilename="insurance.csv"
      searchPlaceholder="Search plate or status"
    />
  );
}
