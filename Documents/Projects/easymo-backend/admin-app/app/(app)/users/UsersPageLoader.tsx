"use client";

import useSWR from "swr";
import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { fetchUsers, fetchUserDetail } from "@/lib/api-client";
import type { UserRecord } from "@/lib/schemas";
import { UsersTable } from "./UsersTable";
import { UserDetailDrawer } from "./UserDetailDrawer";

export function UsersPageLoader() {
  const searchParams = useSearchParams();
  const params = useMemo(() => {
    const next = new URLSearchParams();
    const page = searchParams.get("page");
    const q = searchParams.get("q");
    if (q) next.set("q", q);
    if (page) next.set("page", page);
    return next;
  }, [searchParams]);

  const { data, error, isLoading } = useSWR(["users", params.toString()], () => fetchUsers(params));

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: detail, error: detailError, isLoading: detailLoading } = useSWR(
    selectedUserId ? ["user-detail", selectedUserId] : null,
    () => fetchUserDetail(selectedUserId as string),
  );

  const handleSelectUser = useCallback((user: UserRecord) => {
    setSelectedUserId(user.id);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Users</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
        {data ? `${data.total} users (page ${data.page}, source: ${data.source})` : "Fetching users…"}
      </p>
      {isLoading && <p>Loading users…</p>}
      {error && <p style={{ color: "var(--color-accent-strong)" }}>{String(error)}</p>}
      {data && (
        <UsersTable
          rows={data.items}
          total={data.total}
          page={data.page}
          pageSize={data.pageSize}
          onSelect={handleSelectUser}
          selectedUserId={selectedUserId}
        />
      )}
      <UserDetailDrawer
        open={Boolean(selectedUserId)}
        onClose={handleCloseDrawer}
        loading={Boolean(selectedUserId) && detailLoading}
        error={detailError as Error | undefined}
        data={detail}
      />
    </section>
  );
}
