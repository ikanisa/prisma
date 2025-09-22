"use client";

import { SidebarNav } from "./SidebarNav";
import { AppTopBar } from "./AppTopBar";
import styles from "./ShellLayout.module.css";

interface ShellLayoutProps {
  children: React.ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps) {
  return (
    <div className={styles.wrapper}>
      <SidebarNav />
      <div className={styles.contentArea}>
        <AppTopBar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
