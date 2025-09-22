"use client";

import { useTheme } from "@/providers/ThemeProvider";
import styles from "./AppTopBar.module.css";

export function AppTopBar() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <strong>Command Center</strong>
        <span className={styles.badge}>Beta</span>
      </div>
      <div className={styles.right}>
        <button type="button" onClick={toggleTheme} className={styles.themeButton}>
          {theme === "light" ? "🌞" : "🌙"}
          <span className="sr-only">Toggle theme</span>
        </button>
        <div className={styles.userAvatar} aria-label="Signed in user">
          <span>MO</span>
        </div>
      </div>
    </header>
  );
}
