"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import type { UserRecord } from "@/lib/schemas";

interface UsersTableProps {
  rows: UserRecord[];
  total: number;
  page: number;
  pageSize: number;
  onSelect?: (row: UserRecord) => void;
  selectedUserId?: string | null;
}

const columns: DataTableColumn<UserRecord>[] = [
  { key: "display_name", header: "Name", width: 220 },
  { key: "msisdn_e164", header: "WhatsApp", width: 200 },
  {
    key: "status",
    header: "Status",
    width: 140,
    render: (value) => (value ? String(value) : "—"),
  },
  {
    key: "created_at",
    header: "Created",
    render: (value) => (typeof value === "string" ? new Date(value).toLocaleDateString() : "—"),
  },
  {
    key: "total_vouchers",
    header: "Vouchers",
    render: (value) => (typeof value === "number" ? value : "—"),
  },
];

export function UsersTable({ rows, total, page, pageSize, onSelect, selectedUserId }: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(next));
    }
    router.push(`/users${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <DataTable
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      csvFilename="users.csv"
      searchPlaceholder="Search names or WhatsApp numbers"
      onRowClick={onSelect}
      getRowId={(row) => row.id}
      activeRowId={selectedUserId ?? undefined}
    />
  );
}
