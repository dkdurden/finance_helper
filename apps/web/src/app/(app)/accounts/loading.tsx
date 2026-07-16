import { AppShell } from "@/components/layout/AppShell";
import styles from "./page.module.css";

export default function AccountsLoading() {
  return (
    <AppShell title="Accounts">
      <section className={styles.panel} aria-busy="true" aria-label="Accounts are loading">
        <p className={styles.stateMessage} role="status" aria-live="polite">
          Loading accounts...
        </p>
      </section>
    </AppShell>
  );
}
