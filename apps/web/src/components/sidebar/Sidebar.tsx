"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./Sidebar.module.css";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

const navItems: NavItem[] = [
  {
    href: "/overview",
    icon: "/images/icon-nav-overview.svg",
    label: "Overview",
  },
  {
    href: "/transactions",
    icon: "/images/icon-nav-transactions.svg",
    label: "Transactions",
  },
  {
    href: "/budgets",
    icon: "/images/icon-nav-budgets.svg",
    label: "Budgets",
  },
  {
    href: "/pots",
    icon: "/images/icon-nav-pots.svg",
    label: "Pots",
  },
  {
    href: "/recurring-bills",
    icon: "/images/icon-nav-recurring-bills.svg",
    label: "Recurring bills",
  },
];

type SidebarNavItemProps = {
  collapsed: boolean;
  href: string;
  icon: string;
  label: string;
};

function SidebarNavItem({ collapsed, href, icon, label }: SidebarNavItemProps) {
  return (
    <a
      className={styles.navItem}
      href={href}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
    >
      <Image src={icon} alt="" width={24} height={24} aria-hidden="true" />
      {!collapsed ? <span className={styles.navLabel}>{label}</span> : null}
    </a>
  );
}

type SidebarToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
};

function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps) {
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={onToggle}
      aria-label={collapsed ? "Maximize menu" : "Minimize menu"}
      title={collapsed ? "Maximize menu" : "Minimize menu"}
    >
      <Image
        className={collapsed ? styles.toggleIconCollapsed : styles.toggleIcon}
        src="/images/icon-minimize-menu.svg"
        alt=""
        width={24}
        height={24}
        aria-hidden="true"
      />
      {!collapsed ? <span className={styles.toggleLabel}>Minimize Menu</span> : null}
    </button>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`.trim()}
      aria-label="Primary"
    >
      <div className={styles.logoWrap}>
        <Image
          src={collapsed ? "/images/logo-small.svg" : "/images/logo-large.svg"}
          alt="finance"
          width={collapsed ? 13 : 122}
          height={22}
          priority
        />
      </div>

      <nav className={styles.nav} aria-label="Main navigation">
        {navItems.map((item) => (
          <SidebarNavItem key={item.label} collapsed={collapsed} {...item} />
        ))}
      </nav>

      <SidebarToggle
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
      />
    </aside>
  );
}
