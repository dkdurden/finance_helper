import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/button/Button";
import { OverviewSummaryCard } from "@/features/overview/components/OverviewSummaryCard";
import styles from "./page.module.css";

export default function Home() {
  return (
    <AppShell title="Overview">
      {/* Overview-specific summary row */}
      <section className={styles.summaryGrid} aria-label="Summary cards">
        <OverviewSummaryCard label="Current Balance" value="$0.00" primary />
        <OverviewSummaryCard label="Income" value="$0.00" />
        <OverviewSummaryCard label="Expenses" value="$0.00" />
      </section>

      {/* Page-specific content region for the Overview dashboard */}
      <section className={styles.contentGrid} aria-label="Overview content sections">
        <div className={styles.leftColumn}>
          {/* Pots card: total saved block + savings breakdown */}
          <section className={styles.panel} aria-label="Pots section">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Pots</h2>
              <Button variant="tertiary">See Details</Button>
            </div>

            <div className={styles.potsLayout}>
              <div className={styles.totalSavedCard}>
                <div className={styles.totalSavedIconWrap} aria-hidden="true">
                  <Image
                    src="/images/icon-pot.svg"
                    alt=""
                    width={24}
                    height={24}
                    className={styles.totalSavedIcon}
                  />
                </div>

                <div className={styles.totalSavedContent}>
                  <p className={styles.totalSavedLabel}>Total Saved</p>
                  <p className={styles.totalSavedValue}>$850</p>
                </div>
              </div>

              <div className={styles.potsBreakdown} aria-label="Pot breakdown">
                <div className={styles.potItem}>
                  <span className={`${styles.potAccent} ${styles.potAccentGreen}`} aria-hidden="true" />
                  <div className={styles.potItemContent}>
                    <p className={styles.potItemLabel}>Savings</p>
                    <p className={styles.potItemValue}>$159</p>
                  </div>
                </div>

                <div className={styles.potItem}>
                  <span className={`${styles.potAccent} ${styles.potAccentCyan}`} aria-hidden="true" />
                  <div className={styles.potItemContent}>
                    <p className={styles.potItemLabel}>Gift</p>
                    <p className={styles.potItemValue}>$40</p>
                  </div>
                </div>

                <div className={styles.potItem}>
                  <span className={`${styles.potAccent} ${styles.potAccentNavy}`} aria-hidden="true" />
                  <div className={styles.potItemContent}>
                    <p className={styles.potItemLabel}>Concert Ticket</p>
                    <p className={styles.potItemValue}>$110</p>
                  </div>
                </div>

                <div className={styles.potItem}>
                  <span className={`${styles.potAccent} ${styles.potAccentGold}`} aria-hidden="true" />
                  <div className={styles.potItemContent}>
                    <p className={styles.potItemLabel}>New Laptop</p>
                    <p className={styles.potItemValue}>$10</p>
                  </div>
                </div>
              </div>
            </div>
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
              <Button variant="tertiary">See Details</Button>
            </div>
            <div className={styles.placeholderBlock}>Budget chart placeholder</div>
          </section>

          {/* Recurring bills card: paid, upcoming, due soon summary */}
          <section className={styles.panel} aria-label="Recurring bills section">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Recurring Bills</h2>
              <Button variant="tertiary">See Details</Button>
            </div>
            <div className={styles.placeholderBlock}>Recurring bills summary placeholder</div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
