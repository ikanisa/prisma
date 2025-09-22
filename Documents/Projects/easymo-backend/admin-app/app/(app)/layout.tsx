"use client";

import { AuthGate } from "@/components/AuthGate";
import { ShellLayout } from "@/components/ShellLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ShellLayout>{children}</ShellLayout>
    </AuthGate>
  );
}
