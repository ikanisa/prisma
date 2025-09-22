"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import type { VoucherRecord } from "@/lib/schemas";

interface VouchersTableProps {
  rows: VoucherRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const columns: DataTableColumn<VoucherRecord>[] = [
  { key: "code", header: "Code", width: 120 },
  { key: "status", header: "Status", width: 120 },
  {
    key: "amount",
    header: "Amount",
    width: 140,
    render: (value) =>
      typeof value === "number" ? new Intl.NumberFormat().format(value) + " RWF" : "—",
  },
  {
    key: "issued_at",
    header: "Issued",
    render: (value) => (typeof value === "string" ? new Date(value).toLocaleString() : "—"),
  },
  {
    key: "redeemed_at",
    header: "Redeemed",
    render: (value) => (typeof value === "string" ? new Date(value).toLocaleString() : "—"),
  },
];

export function VouchersTable({ rows, total, page, pageSize }: VouchersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(next));
    }
    router.push(`/vouchers${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <DataTable
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      csvFilename="vouchers.csv"
      searchPlaceholder="Search code or status"
    />
  );
}
