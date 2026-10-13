import Image from "next/image";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { Pagination } from "@/components/pagination/Pagination";
import { SortDropdown } from "@/features/transactions/components/SortDropdown";
import { TransactionCreateControl } from "@/features/transactions/components/TransactionCreateControl";
import { TransactionEditControl } from "@/features/transactions/components/TransactionEditControl";
import { backendUrl } from "@/lib/backendUrl";
import styles from "./page.module.css";

type LedgerEventApiRecord = {
  event_type: "transaction" | "transfer";
  id: number;
  date: string;
  amount_cents: number;
  transaction_type: "normal" | "adjustment" | "transfer";
  merchant: string | null;
  account_id: number | null;
  account_name: string | null;
  category_id: number | null;
  category_name: string | null;
  from_account_name: string | null;
  to_account_name: string | null;
};

type TransactionLoadResult = {
  data: LedgerEventApiRecord[];
  error: string | null;
};

type LedgerEventPageApiResponse = {
  results: LedgerEventApiRecord[];
};

type AccountOptionApiRecord = {
  id: number;
  is_liability: boolean;
  name: string;
};

type CategoryOptionApiRecord = {
  id: number;
  is_archived: boolean;
  name: string;
};

type TransactionFormOptions = {
  accounts: Array<{ id: number; isLiability: boolean; name: string }>;
  categories: Array<{ id: number; name: string }>;
  error: string | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  signDisplay: "always",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

async function getTransactions(): Promise<TransactionLoadResult> {
  try {
    const cookieStore = await cookies();
    const response = await fetch(backendUrl("/api/ledger-events/"), {
      headers: {
        cookie: cookieStore.toString(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { data: [], error: "Unable to load transactions right now." };
    }

    const data: unknown = await response.json();

    if (
      typeof data !== "object" ||
      data === null ||
      !("results" in data) ||
      !Array.isArray(data.results)
    ) {
      return { data: [], error: "The transaction service returned an unexpected response." };
    }

    return { data: (data as LedgerEventPageApiResponse).results, error: null };
  } catch {
    return { data: [], error: "Unable to load transactions right now." };
  }
}

async function getTransactionFormOptions(): Promise<TransactionFormOptions> {
  try {
    const cookieStore = await cookies();
    const headers = { cookie: cookieStore.toString() };
    const [accountsResponse, categoriesResponse] = await Promise.all([
      fetch(backendUrl("/api/accounts/"), { headers, cache: "no-store" }),
      fetch(backendUrl("/api/categories/"), { headers, cache: "no-store" }),
    ]);

    if (!accountsResponse.ok || !categoriesResponse.ok) {
      return {
        accounts: [],
        categories: [],
        error: "Unable to load transaction form options right now.",
      };
    }

    const accountsData: unknown = await accountsResponse.json();
    const categoriesData: unknown = await categoriesResponse.json();

    if (!Array.isArray(accountsData) || !Array.isArray(categoriesData)) {
      return {
        accounts: [],
        categories: [],
        error: "The transaction form services returned an unexpected response.",
      };
    }

    return {
      accounts: (accountsData as AccountOptionApiRecord[]).map((account) => ({
        id: account.id,
        isLiability: account.is_liability,
        name: account.name,
      })),
      categories: (categoriesData as CategoryOptionApiRecord[])
        .filter((category) => !category.is_archived)
        .map((category) => ({ id: category.id, name: category.name })),
      error: null,
    };
  } catch {
    return {
      accounts: [],
      categories: [],
      error: "Unable to load transaction form options right now.",
    };
  }
}

function formatAmount(amountCents: number) {
  return currencyFormatter.format(amountCents / 100);
}

function formatDate(date: string) {
  return dateFormatter.format(new Date(date + "T00:00:00Z"));
}

function getTransactionName(transaction: LedgerEventApiRecord) {
  if (transaction.event_type === "transfer") {
    if (transaction.from_account_name && transaction.to_account_name) {
      return `${transaction.from_account_name} to ${transaction.to_account_name}`;
    }

    return "Transfer";
  }

  if (transaction.merchant?.trim()) {
    return transaction.merchant.trim();
  }

  if (transaction.transaction_type === "adjustment") {
    return "Balance adjustment";
  }

  return "Transaction";
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase() || "T"
  );
}

const sortOptions = [
  { label: "Latest", value: "latest" },
  { label: "Oldest", value: "oldest" },
  { label: "A to Z", value: "a-to-z" },
  { label: "Z to A", value: "z-to-a" },
  { label: "Highest", value: "highest" },
  { label: "Lowest", value: "lowest" },
];

const categoryOptions = [
  { label: "All Transactions", value: "all" },
  { label: "Entertainment", value: "entertainment" },
  { label: "Bills", value: "bills" },
  { label: "Groceries", value: "groceries" },
  { label: "Dining Out", value: "dining-out" },
  { label: "Transportation", value: "transportation" },
  { label: "Personal Care", value: "personal-care" },
  { label: "Education", value: "education" },
  { label: "Lifestyle", value: "lifestyle" },
  { label: "Shopping", value: "shopping" },
  { label: "General", value: "general" },
];

export default async function TransactionsPage() {
  const [{ data: transactions, error }, formOptions] = await Promise.all([
    getTransactions(),
    getTransactionFormOptions(),
  ]);
  return (
    <AppShell
      title="Transactions"
      headerAction={
        <TransactionCreateControl
          accounts={formOptions.accounts}
          categories={formOptions.categories}
          optionsError={formOptions.error}
        />
      }
    >
      <section className={styles.panel} aria-label="Transactions list and controls">
        <div className={styles.toolbar} aria-label="Transaction controls">
          <label className={styles.searchField}>
            <span className={styles.visuallyHidden}>Search transaction</span>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Search transaction"
            />
            <span className={styles.searchIcon} aria-hidden="true" />
          </label>

          <div className={styles.filters}>
            <div className={styles.filterControl}>
              <span className={styles.filterLabel}>Sort by</span>
              <SortDropdown ariaLabel="Sort transactions" options={sortOptions} />
            </div>

            <div className={styles.filterControl}>
              <span className={styles.filterLabel}>Category</span>
              <SortDropdown
                ariaLabel="Filter transactions by category"
                minWidth="wide"
                options={categoryOptions}
              />
            </div>
          </div>

          <div className={styles.mobileFilterButtons} aria-label="Mobile transaction controls">
            <button className={styles.mobileIconButton} type="button" aria-label="Sort transactions">
              <Image src="/images/icon-sort-mobile.svg" alt="" width={20} height={20} aria-hidden="true" />
            </button>
            <button className={styles.mobileIconButton} type="button" aria-label="Filter transactions by category">
              <Image src="/images/icon-filter-mobile.svg" alt="" width={20} height={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.tableHeader} aria-hidden="true">
          <span>Recipient / Sender</span>
          <span>Category</span>
          <span>Transaction Date</span>
          <span className={styles.amountHeader}>Amount</span>
        </div>

        <div className={styles.transactionList}>
          {error ? (
            <p
              className={[styles.stateMessage, styles.errorMessage].join(" ")}
              role="alert"
            >
              {error}
            </p>
          ) : transactions.length === 0 ? (
            <p className={styles.stateMessage}>No transactions yet.</p>
          ) : (
            transactions.map((transaction) => {
              const name = getTransactionName(transaction);

              return (
                <article
                  className={styles.transactionRow}
                  key={`${transaction.event_type}-${transaction.id}`}
                >
                  <div className={styles.recipientCell}>
                    <span className={styles.avatarFallback} aria-hidden="true">
                      {getInitials(name)}
                    </span>
                    <p className={styles.recipientName}>{name}</p>
                  </div>

                  <p className={styles.categoryCell}>
                    {transaction.event_type === "transfer"
                      ? "Transfer"
                      : transaction.category_name}
                  </p>
                  <p className={styles.dateCell}>{formatDate(transaction.date)}</p>
                  <div className={styles.amountActionsCell}>
                    <p
                      className={[
                        styles.amountCell,
                        transaction.amount_cents > 0 ? styles.amountPositive : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {formatAmount(transaction.amount_cents)}
                    </p>
                    {transaction.event_type === "transaction" &&
                    transaction.transaction_type === "normal" &&
                    transaction.account_id !== null &&
                    transaction.category_id !== null &&
                    transaction.category_name !== null ? (
                      <TransactionEditControl
                        accounts={formOptions.accounts}
                        categories={formOptions.categories}
                        optionsError={formOptions.error}
                        transaction={{
                          accountId: transaction.account_id,
                          categoryId: transaction.category_id,
                          categoryName: transaction.category_name,
                          id: transaction.id,
                          name,
                          signedAmountCents: transaction.amount_cents,
                        }}
                      />
                    ) : (
                      <span className={styles.actionPlaceholder} aria-hidden="true" />
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {!error && transactions.length > 0 ? <Pagination mobileCompact /> : null}
      </section>
    </AppShell>
  );
}
