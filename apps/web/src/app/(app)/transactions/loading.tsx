import { AppShell } from "@/components/layout/AppShell";
import styles from "./page.module.css";

export function TransactionsLoading() {
  return (
    <AppShell title="Transactions">
      <section
        className={styles.panel}
        aria-busy="true"
        aria-label="Transactions are loading"
      >
        <p className={styles.stateMessage} role="status" aria-live="polite">
          Loading transactions...
        </p>
      </section>
    </AppShell>
  );
}

export default TransactionsLoading;