import { Button } from "@/components/button/Button";
import { AppShell } from "@/components/layout/AppShell";
import { BudgetDonutChart } from "@/features/overview/components/BudgetDonutChart";
import styles from "./page.module.css";

const spendingSummary = [
  {
    name: "Entertainment",
    spent: "$15.00",
    limit: "$50.00",
    accentClass: styles.accentGreen,
  },
  {
    name: "Bills",
    spent: "$150.00",
    limit: "$750.00",
    accentClass: styles.accentCyan,
  },
  {
    name: "Dining Out",
    spent: "$133.00",
    limit: "$75.00",
    accentClass: styles.accentGold,
  },
  {
    name: "Personal Care",
    spent: "$40.00",
    limit: "$100.00",
    accentClass: styles.accentNavy,
  },
];

export default function BudgetsPage() {
  return (
    <AppShell
      title="Budgets"
      headerAction={<Button>+ Add New Budget</Button>}
    >
      <section className={styles.contentGrid} aria-label="Budgets overview">
        <aside className={styles.summaryPanel} aria-label="Spending summary">
          <div className={styles.chartWrap}>
            <BudgetDonutChart />
          </div>

          <div className={styles.summaryContent}>
            <h2 className={styles.panelTitle}>Spending Summary</h2>

            <div className={styles.summaryList}>
              {spendingSummary.map((item, index) => (
                <div className={styles.summaryItemWrap} key={item.name}>
                  <div className={styles.summaryItem}>
                    <div className={styles.summaryNameWrap}>
                      <span
                        className={`${styles.summaryAccent} ${item.accentClass}`}
                        aria-hidden="true"
                      />
                      <p className={styles.summaryName}>{item.name}</p>
                    </div>

                    <p className={styles.summaryAmount}>
                      <span>{item.spent}</span>
                      <span className={styles.summaryLimit}>
                        of {item.limit}
                      </span>
                    </p>
                  </div>

                  {index < spendingSummary.length - 1 ? (
                    <div className={styles.summaryDivider} aria-hidden="true" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className={styles.budgetCardsPlaceholder} aria-label="Budget cards">
          <p>Budget cards will be added in the next slice.</p>
        </div>
      </section>
    </AppShell>
  );
}
