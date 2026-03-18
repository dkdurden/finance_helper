import { AppShell } from "@/components/layout/AppShell";
import styles from "./page.module.css";

export default function Home() {
  return (
    <AppShell title="Overview">
      {/* Overview-specific summary row */}
      <section className={styles.summaryGrid} aria-label="Summary cards">
        <article className={styles.summaryCardPrimary}>
          <p className={styles.summaryLabel}>Current Balance</p>
          <p className={styles.summaryValue}>$0.00</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Income</p>
          <p className={styles.summaryValue}>$0.00</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Expenses</p>
          <p className={styles.summaryValue}>$0.00</p>
        </article>
      </section>

      {/* Page-specific content region for the Overview dashboard */}
      <section className={styles.contentGrid} aria-label="Overview content sections">
        <div className={styles.leftColumn}>
          {/* Pots card: total saved block + savings breakdown */}
          <section className={styles.panel} aria-label="Pots section">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Pots</h2>
              <button className={styles.panelAction} type="button">
                See Details
              </button>
            </div>
            <div className={styles.placeholderBlock}>Pots content placeholder</div>
          </section>

          {/* Transactions card: latest transactions list */}
          <section className={styles.panel} aria-label="Transactions section">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Transactions</h2>
              <button className={styles.panelAction} type="button">
                View All
              </button>
            </div>
            <div className={styles.placeholderBlock}>Transactions list placeholder</div>
          </section>
        </div>

        <div className={styles.rightColumn}>
          {/* Budgets card: chart + category breakdown */}
          <section className={styles.panel} aria-label="Budgets section">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Budgets</h2>
              <button className={styles.panelAction} type="button">
                See Details
              </button>
            </div>
            <div className={styles.placeholderBlock}>Budget chart placeholder</div>
          </section>

          {/* Recurring bills card: paid, upcoming, due soon summary */}
          <section className={styles.panel} aria-label="Recurring bills section">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Recurring Bills</h2>
              <button className={styles.panelAction} type="button">
                See Details
              </button>
            </div>
            <div className={styles.placeholderBlock}>Recurring bills summary placeholder</div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}