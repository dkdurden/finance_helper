import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/button/Button";
import { OverviewSummaryCard } from "@/features/overview/components/OverviewSummaryCard";
import styles from "./page.module.css";

const recentTransactions = [
  {
    name: "Emma Richardson",
    date: "19 Aug 2024",
    amount: "+$75.50",
    positive: true,
    avatar: "/images/avatars/emma-richardson.jpg",
  },
  {
    name: "Savory Bites Bistro",
    date: "19 Aug 2024",
    amount: "-$55.50",
    positive: false,
    avatar: "/images/avatars/savory-bites-bistro.jpg",
  },
  {
    name: "Daniel Carter",
    date: "18 Aug 2024",
    amount: "-$42.30",
    positive: false,
    avatar: "/images/avatars/daniel-carter.jpg",
  },
  {
    name: "Sun Park",
    date: "17 Aug 2024",
    amount: "+$120.00",
    positive: true,
    avatar: "/images/avatars/sun-park.jpg",
  },
  {
    name: "Urban Services Hub",
    date: "17 Aug 2024",
    amount: "-$65.00",
    positive: false,
    avatar: "/images/avatars/urban-services-hub.jpg",
  },
];

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
              <Button variant="tertiary">View All</Button>
            </div>

            <div className={styles.transactionsList}>
              {recentTransactions.map((transaction, index) => (
                <article className={styles.transactionRow} key={`${transaction.name}-${transaction.date}`}>
                  <div className={styles.transactionRowContent}>
                    <div className={styles.transactionIdentity}>
                      <Image
                        src={transaction.avatar}
                        alt=""
                        width={40}
                        height={40}
                        className={styles.transactionAvatar}
                      />
                      <div className={styles.transactionDetails}>
                        <p className={styles.transactionName}>{transaction.name}</p>
                      </div>
                    </div>

                    <div className={styles.transactionMeta}>
                      <p
                        className={`${styles.transactionAmount} ${
                          transaction.positive ? styles.transactionAmountPositive : styles.transactionAmountNegative
                        }`}
                      >
                        {transaction.amount}
                      </p>
                      <p className={styles.transactionDate}>{transaction.date}</p>
                    </div>
                  </div>

                  {index < recentTransactions.length - 1 ? <div className={styles.transactionDivider} aria-hidden="true" /> : null}
                </article>
              ))}
            </div>
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
