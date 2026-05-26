import { Button } from "@/components/button/Button";
import { AppShell } from "@/components/layout/AppShell";
import { BudgetCard } from "@/features/budgets/components";
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

const budgetCards = [
  {
    title: "Entertainment",
    limit: "$50.00",
    spent: "$15.00",
    remaining: "$35.00",
    tone: "green" as const,
    usedPercent: 30,
    spendingItems: [
      {
        name: "James Thompson",
        amount: "-$5.00",
        date: "11 Aug 2024",
        avatar: "/images/avatars/james-thompson.jpg",
      },
      {
        name: "Pixel Playground",
        amount: "-$10.00",
        date: "11 Aug 2024",
        avatar: "/images/avatars/pixel-playground.jpg",
      },
      {
        name: "Rina Sato",
        amount: "-$10.00",
        date: "13 Jul 2024",
        avatar: "/images/avatars/rina-sato.jpg",
      },
    ],
  },
  {
    title: "Bills",
    limit: "$750.00",
    spent: "$150.00",
    remaining: "$600.00",
    tone: "cyan" as const,
    usedPercent: 20,
    spendingItems: [
      {
        name: "Spark Electric Solutions",
        amount: "-$100.00",
        date: "2 Aug 2024",
        avatar: "/images/avatars/spark-electric-solutions.jpg",
      },
      {
        name: "Rina Sato",
        amount: "-$50.00",
        date: "2 Aug 2024",
        avatar: "/images/avatars/rina-sato.jpg",
      },
      {
        name: "Aqua Flow Utilities",
        amount: "-$100.00",
        date: "30 Jul 2024",
        avatar: "/images/avatars/aqua-flow-utilities.jpg",
      },
    ],
  },
  {
    title: "Dining Out",
    limit: "$75.00",
    spent: "$133.75",
    remaining: "$0",
    tone: "yellow" as const,
    usedPercent: 100,
    spendingItems: [
      {
        name: "Savory Bites Bistro",
        amount: "-$55.50",
        date: "19 Aug 2024",
        avatar: "/images/avatars/savory-bites-bistro.jpg",
      },
      {
        name: "Ethan Clark",
        amount: "-$32.50",
        date: "20 Aug 2024",
        avatar: "/images/avatars/ethan-clark.jpg",
      },
      {
        name: "Ella Phillips",
        amount: "-$45.00",
        date: "10 Aug 2024",
        avatar: "/images/avatars/ella-phillips.jpg",
      },
    ],
  },
  {
    title: "Personal Care",
    limit: "$100.00",
    spent: "$40.00",
    remaining: "$60.00",
    tone: "navy" as const,
    usedPercent: 40,
    spendingItems: [
      {
        name: "William Harris",
        amount: "-$10.00",
        date: "5 Aug 2024",
        avatar: "/images/avatars/william-harris.jpg",
      },
      {
        name: "Serenity Spa & Wellness",
        amount: "-$30.00",
        date: "3 Aug 2024",
        avatar: "/images/avatars/serenity-spa-and-wellness.jpg",
      },
      {
        name: "Serenity Spa & Wellness",
        amount: "-$30.00",
        date: "3 Jul 2024",
        avatar: "/images/avatars/serenity-spa-and-wellness.jpg",
      },
    ],
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

        <div className={styles.budgetCards} aria-label="Budget cards">
          {budgetCards.map((budget) => (
            <BudgetCard key={budget.title} {...budget} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
