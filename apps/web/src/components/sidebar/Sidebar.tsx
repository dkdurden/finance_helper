"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
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

const TOGGLE_ARC_RADIUS = 8;
const TOGGLE_ARC_CENTER_Y = 10;

function getToggleArcPosition(progress: number) {
  const angle = Math.PI - Math.PI * progress;
  const verticalDip = 35 * Math.sin(Math.PI * progress);

  return {
    x: Math.cos(angle) * TOGGLE_ARC_RADIUS,
    y:
      TOGGLE_ARC_CENTER_Y -
      Math.sin(angle) * TOGGLE_ARC_RADIUS -
      10 +
      verticalDip,
  };
}

type SidebarNavItemProps = {
  active: boolean;
  collapsed: boolean;
  href: string;
  icon: string;
  label: string;
};

function SidebarNavItem({
  active,
  collapsed,
  href,
  icon,
  label,
}: SidebarNavItemProps) {
  return (
    <a
      className={cn(styles.navItem, active && styles.navItemActive)}
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
    >
      <Image
        className={styles.icon}
        src={icon}
        alt=""
        width={24}
        height={24}
        aria-hidden="true"
      />
      {!collapsed ? <span className={styles.navLabel}>{label}</span> : null}
    </a>
  );
}

type SidebarToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
};

function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps) {
  const progress = useMotionValue(collapsed ? 1 : 0);

  useEffect(() => {
    const controls = animate(progress, collapsed ? 1 : 0, {
      duration: 0.4,
      ease: [0.45, 0, 0.55, 1],
    });

    return () => controls.stop();
  }, [collapsed, progress]);

  const x = useTransform(progress, (latest) => getToggleArcPosition(latest).x);
  const y = useTransform(progress, (latest) => getToggleArcPosition(latest).y);
  const rotate = useTransform(progress, [0, 1], [0, -180]);

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={onToggle}
      aria-label={collapsed ? "Maximize menu" : "Minimize menu"}
      title={collapsed ? "Maximize menu" : "Minimize menu"}
    >
      <motion.span
        className={styles.toggleIconMotionWrap}
        initial={false}
        style={{ x, y, rotate }}
      >
        <Image
          className={styles.icon}
          src="/images/icon-minimize-menu.svg"
          alt=""
          width={24}
          height={24}
          aria-hidden="true"
        />
      </motion.span>
      <span
        className={cn(
          styles.toggleLabel,
          collapsed && styles.toggleLabelCollapsed,
        )}
        aria-hidden={collapsed}
      >
        Minimize Menu
      </span>
    </button>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(styles.sidebar, collapsed && styles.collapsed)}
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
          <SidebarNavItem
            key={item.label}
            active={
              pathname === item.href ||
              (pathname === "/" && item.href === "/overview")
            }
            collapsed={collapsed}
            {...item}
          />
        ))}
      </nav>

      <SidebarToggle
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
      />
    </aside>
  );
}