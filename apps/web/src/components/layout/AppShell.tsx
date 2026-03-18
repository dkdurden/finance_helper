import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar/Sidebar";
import styles from "./AppShell.module.css";

type AppShellProps = {
  children: ReactNode;
  title: string;
};

export function AppShell({ children, title }: AppShellProps) {
  return (
    <main className={styles.page}>
      <Sidebar />

      <section className={styles.appShell} aria-label={`${title} page shell`}>
        <div className={styles.appShellInner}>
          <header className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{title}</h1>
          </header>

          {children}
        </div>
      </section>
    </main>
  );
}