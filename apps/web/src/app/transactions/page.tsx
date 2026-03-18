import { AppShell } from "@/components/layout/AppShell";
import styles from "./page.module.css";

export default function TransactionsPage() {
  return (
    <AppShell title="Transactions">
      {/* Transactions-specific toolbar region */}
      <section className={styles.toolbarPanel} aria-label="Transaction controls">
        <div className={styles.toolbarRow}>
          <div className={styles.searchPlaceholder}>Search transaction placeholder</div>
          <div className={styles.toolbarActions}>
            <div className={styles.controlPlaceholder}>Sort placeholder</div>
            <div className={styles.controlPlaceholder}>Category filter placeholder</div>
          </div>
        </div>
      </section>

      {/* Transactions-specific list region */}
      <section className={styles.tablePanel} aria-label="Transactions list">
        <div className={styles.tableHeader}>
          <span>Recipient / Sender</span>
          <span>Category</span>
          <span>Transaction Date</span>
          <span>Amount</span>
        </div>

        <div className={styles.tableBody}>
          <div className={styles.rowPlaceholder}>Transaction row placeholder</div>
          <div className={styles.rowPlaceholder}>Transaction row placeholder</div>
          <div className={styles.rowPlaceholder}>Transaction row placeholder</div>
          <div className={styles.rowPlaceholder}>Transaction row placeholder</div>
          <div className={styles.rowPlaceholder}>Transaction row placeholder</div>
        </div>
      </section>

      {/* Transactions-specific pagination region */}
      <section className={styles.paginationPanel} aria-label="Transactions pagination">
        <div className={styles.paginationPlaceholder}>Pagination controls placeholder</div>
      </section>
    </AppShell>
  );
}
