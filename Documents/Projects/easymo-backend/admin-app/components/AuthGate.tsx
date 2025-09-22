"use client";

import { useState } from "react";

interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * Placeholder authentication boundary. Replace with Supabase auth in later phases.
 */
export function AuthGate({ children }: AuthGateProps) {
  const [status] = useState<"loading" | "authenticated">("authenticated");

  if (status === "loading") {
    return (
      <div className="centered">
        <p className="muted">Checking credentials…</p>
      </div>
    );
  }

  return <>{children}</>;
}
