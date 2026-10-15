import Image from "next/image";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/button/Button";
import { OverviewSummaryCard } from "@/features/overview/components/OverviewSummaryCard";
import { SpendingByCategoryChart } from "@/features/overview/components/SpendingByCategoryChart";
import { backendUrl } from "@/lib/backendUrl";
import { formatCalendarMonth, getCurrentYearMonth } from "@/lib/date";
import styles from "./page.module.css";

type AccountApiRecord = {
  id: number;
  is_liability: boolean;
  balance_cents: number;
};

type MonthlySummary = {
  expenseCents: number;
  incomeCents: number;
};

type CategorySpending = {
  categoryId: number | null;
  categoryName: string;
  expenseCents: number;
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

async function getCurrentMonthSummary(month: string): Promise<MonthlySummary | null> {
  try {
    const cookieStore = await cookies();
    const response = await fetch(
      backendUrl(`/api/reports/monthly-summary/?month=${month}`),
      {
        headers: { cookie: cookieStore.toString() },
        cache: "no-store",
      },
    );

    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("income_cents" in data) ||
      typeof data.income_cents !== "number" ||
      !("expense_cents" in data) ||
      typeof data.expense_cents !== "number"
    ) {
      return null;
    }

    return {
      incomeCents: data.income_cents,
      expenseCents: data.expense_cents,
    };
  } catch {
    return null;
  }
}

async function getSpendingByCategory(month: string): Promise<CategorySpending[] | null> {
  try {
    const cookieStore = await cookies();
    const response = await fetch(
      backendUrl(`/api/reports/spending-by-category/?month=${month}`),
      {
        headers: { cookie: cookieStore.toString() },
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("categories" in data) ||
      !Array.isArray(data.categories)
    ) {
      return null;
    }
    const categories: CategorySpending[] = [];
    for (const value of data.categories) {
      if (
        !value ||
        typeof value !== "object" ||
        !("category_id" in value) ||
        (typeof value.category_id !== "number" && value.category_id !== null) ||
        !("category_name" in value) ||
        typeof value.category_name !== "string" ||
        !("expense_cents" in value) ||
        typeof value.expense_cents !== "number"
      ) {
        return null;
      }
      categories.push({
        categoryId: value.category_id,
        categoryName: value.category_name,
        expenseCents: value.expense_cents,
      });
    }
    return categories;
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

const spendingPalette = [
  { accentClass: styles.budgetAccentGreen, color: "var(--color-green)" },
  { accentClass: styles.budgetAccentCyan, color: "var(--color-cyan)" },
  { accentClass: styles.budgetAccentGold, color: "var(--color-yellow)" },
  { accentClass: styles.budgetAccentNavy, color: "var(--color-navy)" },
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
  const currentMonth = getCurrentYearMonth();
  const currentMonthLabel = formatCalendarMonth(currentMonth);
  const [currentBalanceCents, monthlySummary, categorySpending] = await Promise.all([
    getCurrentBalanceCents(),
    getCurrentMonthSummary(currentMonth),
    getSpendingByCategory(currentMonth),
  ]);
  const currentBalance =
    currentBalanceCents === null
      ? "Unavailable"
      : currencyFormatter.format(currentBalanceCents / 100);
  const monthlyIncome =
    monthlySummary === null
      ? "Unavailable"
      : currencyFormatter.format(monthlySummary.incomeCents / 100);
  const monthlyExpenses =
    monthlySummary === null
      ? "Unavailable"
      : currencyFormatter.format(monthlySummary.expenseCents / 100);
  const totalCategorySpending = categorySpending?.reduce(
    (total, category) => total + category.expenseCents,
    0,
  ) ?? 0;
  const visibleCategorySpending = categorySpending
    ? [
        ...categorySpending.slice(0, 4),
        ...(categorySpending.length > 4
          ? [{
              categoryId: null,
              categoryName: "Other",
              expenseCents: categorySpending
                .slice(4)
                .reduce((total, category) => total + category.expenseCents, 0),
            }]
          : []),
      ].map((category, index) => ({
        ...category,
        accentClass:
          category.categoryName === "Other"
            ? styles.budgetAccentNeutral
            : spendingPalette[index]?.accentClass ?? styles.budgetAccentNeutral,
        color:
          category.categoryName === "Other"
            ? "var(--color-grey-300)"
            : spendingPalette[index]?.color ?? "var(--color-grey-300)",
      }))
    : null;

  return (
    <AppShell title="Overview">
      {/* Overview-specific summary row */}
      <section className={styles.summaryGrid} aria-label="Summary cards">
        <OverviewSummaryCard label="Current Balance" value={currentBalance} primary />
        <OverviewSummaryCard label={`Income — ${currentMonthLabel}`} value={monthlyIncome} />
        <OverviewSummaryCard label={`Expenses — ${currentMonthLabel}`} value={monthlyExpenses} />
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
          <section className={styles.panel} aria-label="Monthly spending by category">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                Spending by Category — {currentMonthLabel}
              </h2>
            </div>
            {visibleCategorySpending === null ? (
              <p className={styles.spendingState} role="alert">
                Spending by category is unavailable.
              </p>
            ) : visibleCategorySpending.length === 0 ? (
              <p className={styles.spendingState}>No expenses recorded this month.</p>
            ) : (
              <div className={styles.budgetsLayout}>
                <div className={styles.budgetChartWrap}>
                  <SpendingByCategoryChart
                    segments={visibleCategorySpending.map((category) => ({
                      color: category.color,
                      name: category.categoryName,
                      value: category.expenseCents,
                    }))}
                    totalLabel={currencyFormatter.format(totalCategorySpending / 100)}
                  />
                </div>
                <div className={styles.budgetBreakdown} aria-label="Spending breakdown">
                  {visibleCategorySpending.map((category) => (
                    <div className={styles.budgetItem} key={category.categoryName}>
                      <span className={`${styles.budgetAccent} ${category.accentClass}`} aria-hidden="true" />
                      <div className={styles.budgetItemContent}>
                        <p className={styles.budgetItemLabel}>{category.categoryName}</p>
                        <p className={styles.budgetItemValue}>
                          {currencyFormatter.format(category.expenseCents / 100)} · {Math.round(category.expenseCents / totalCategorySpending * 100)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
