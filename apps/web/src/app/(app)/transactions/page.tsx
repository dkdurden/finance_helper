import Image from "next/image";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { Pagination } from "@/components/pagination/Pagination";
import { SortDropdown } from "@/features/transactions/components/SortDropdown";
import { backendUrl } from "@/lib/backendUrl";
import styles from "./page.module.css";

type TransactionApiRecord = {
  id: number;
  date: string;
  signed_amount_cents: number;
  transaction_type: "normal" | "adjustment" | "transfer";
  merchant: string | null;
  category_name: string;
};

type TransactionLoadResult = {
  data: TransactionApiRecord[];
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
    const response = await fetch(backendUrl("/api/transactions/"), {
      headers: {
        cookie: cookieStore.toString(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { data: [], error: "Unable to load transactions right now." };
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      return { data: [], error: "The transaction service returned an unexpected response." };
    }

    return { data: data as TransactionApiRecord[], error: null };
  } catch {
    return { data: [], error: "Unable to load transactions right now." };
  }
}

function formatAmount(amountCents: number) {
  return currencyFormatter.format(amountCents / 100);
}

function formatDate(date: string) {
  return dateFormatter.format(new Date(date + "T00:00:00Z"));
}

function getTransactionName(transaction: TransactionApiRecord) {
  if (transaction.merchant?.trim()) {
    return transaction.merchant.trim();
  }

  if (transaction.transaction_type === "adjustment") {
    return "Balance adjustment";
  }

  if (transaction.transaction_type === "transfer") {
    return "Transfer";
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
  const { data: transactions, error } = await getTransactions();
  return (
    <AppShell title="Transactions">
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
                <article className={styles.transactionRow} key={transaction.id}>
                  <div className={styles.recipientCell}>
                    <span className={styles.avatarFallback} aria-hidden="true">
                      {getInitials(name)}
                    </span>
                    <p className={styles.recipientName}>{name}</p>
                  </div>

                  <p className={styles.categoryCell}>{transaction.category_name}</p>
                  <p className={styles.dateCell}>{formatDate(transaction.date)}</p>
                  <p
                    className={[
                      styles.amountCell,
                      transaction.signed_amount_cents > 0 ? styles.amountPositive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {formatAmount(transaction.signed_amount_cents)}
                  </p>
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
