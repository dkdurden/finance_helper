import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar/Sidebar";
import styles from "./AppShell.module.css";

type AppShellProps = {
  children: ReactNode;
  headerAction?: ReactNode;
  title: string;
};

export function AppShell({ children, headerAction, title }: AppShellProps) {
  return (
    <main className={styles.page}>
      <Sidebar />

      <section className={styles.appShell} aria-label={`${title} page shell`}>
        <div className={styles.appShellInner}>
          <header className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{title}</h1>
            {headerAction ? (
              <div className={styles.pageHeaderAction}>{headerAction}</div>
            ) : null}
          </header>

          {children}
        </div>
      </section>
    </main>
  );
}
