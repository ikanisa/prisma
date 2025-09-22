export type NavItem = {
  label: string;
  href: string;
  icon?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Users", href: "/users", icon: "👥" },
  { label: "Insurance", href: "/insurance", icon: "🧾" },
  { label: "Vouchers", href: "/vouchers", icon: "🎟️" },
  { label: "Campaigns", href: "/campaigns", icon: "📣" },
  { label: "Stations", href: "/stations", icon: "⛽" },
  { label: "Files", href: "/files", icon: "🗂️" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
  { label: "Logs", href: "/logs", icon: "📜" }
];
