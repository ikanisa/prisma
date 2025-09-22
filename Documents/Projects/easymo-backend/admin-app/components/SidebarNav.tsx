"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav-items";
import styles from "./SidebarNav.module.css";

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.sidebar} aria-label="Primary">
      <div className={styles.brand}>easyMO Admin</div>
      <ul className={styles.list}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link href={item.href} className={isActive ? styles.active : styles.link}>
                <span className={styles.icon} aria-hidden="true">
                  {item.icon ?? "•"}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
