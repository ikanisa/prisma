"use client";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import type { VoucherRecord } from "@/lib/schemas";

interface RecentVouchersTableProps {
  rows: VoucherRecord[];
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
];

export function RecentVouchersTable({ rows }: RecentVouchersTableProps) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      csvFilename="dashboard-vouchers.csv"
      searchPlaceholder="Search codes or status"
    />
  );
}
