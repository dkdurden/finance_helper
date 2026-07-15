import Image from "next/image";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/button/Button";
import { BudgetDonutChart } from "@/features/overview/components/BudgetDonutChart";
import { OverviewSummaryCard } from "@/features/overview/components/OverviewSummaryCard";
import { backendUrl } from "@/lib/backendUrl";
import styles from "./page.module.css";

type AccountApiRecord = {
  id: number;
  is_liability: boolean;
  balance_cents: number;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

async function getCurrentBalanceCents(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const response = await fetch(backendUrl("/api/accounts/"), {
      headers: {
        cookie: cookieStore.toString(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      return null;
    }

    return (data as AccountApiRecord[]).reduce(
      (total, account) =>
        total + (account.is_liability ? -account.balance_cents : account.balance_cents),
      0,
    );
  } catch {
    return null;
  }
}

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

const budgetCategories = [
  {
    name: "Entertainment",
    amount: "$50.00",
    accentClass: styles.budgetAccentGreen,
  },
  {
    name: "Bills",
    amount: "$750.00",
    accentClass: styles.budgetAccentCyan,
  },
  {
    name: "Dining Out",
    amount: "$75.00",
    accentClass: styles.budgetAccentGold,
  },
  {
    name: "Personal Care",
    amount: "$100.00",
    accentClass: styles.budgetAccentNavy,
  },
];

const recurringBills = [
  {
    label: "Paid Bills",
    amount: "$190.00",
    accentClass: styles.billAccentGreen,
  },
  {
    label: "Total Upcoming",
    amount: "$194.98",
    accentClass: styles.billAccentGold,
  },
  {
    label: "Due Soon",
    amount: "$59.98",
    accentClass: styles.billAccentCyan,
  },
];

export default async function Home() {
  const currentBalanceCents = await getCurrentBalanceCents();
  const currentBalance =
    currentBalanceCents === null
      ? "Unavailable"
      : currencyFormatter.format(currentBalanceCents / 100);

  return (
    <AppShell title="Overview">
      {/* Overview-specific summary row */}
      <section className={styles.summaryGrid} aria-label="Summary cards">
        <OverviewSummaryCard label="Current Balance" value={currentBalance} primary />
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

            <div className={styles.budgetsLayout}>
              <div className={styles.budgetChartWrap}>
                <BudgetDonutChart />
              </div>

              <div className={styles.budgetBreakdown} aria-label="Budget breakdown">
                {budgetCategories.map((category) => (
                  <div className={styles.budgetItem} key={category.name}>
                    <span className={`${styles.budgetAccent} ${category.accentClass}`} aria-hidden="true" />
                    <div className={styles.budgetItemContent}>
                      <p className={styles.budgetItemLabel}>{category.name}</p>
                      <p className={styles.budgetItemValue}>{category.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Recurring bills card: paid, upcoming, due soon summary */}
          <section className={styles.panel} aria-label="Recurring bills section">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Recurring Bills</h2>
              <Button variant="tertiary">See Details</Button>
            </div>

            <div className={styles.recurringBillsList} aria-label="Recurring bills summary">
              {recurringBills.map((bill) => (
                <div className={`${styles.billSummaryRow} ${bill.accentClass}`} key={bill.label}>
                  <p className={styles.billSummaryLabel}>{bill.label}</p>
                  <p className={styles.billSummaryAmount}>{bill.amount}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
