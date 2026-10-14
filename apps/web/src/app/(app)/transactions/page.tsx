import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Pagination } from "@/components/pagination/Pagination";
import { SortDropdown } from "@/features/transactions/components/SortDropdown";
import { TransactionCreateControl } from "@/features/transactions/components/TransactionCreateControl";
import { TransactionEditControl } from "@/features/transactions/components/TransactionEditControl";
import { ReceiptDeleteControl } from "@/features/transactions/components/ReceiptDeleteControl";
import { TransferActionControl } from "@/features/transactions/components/TransferActionControl";
import { backendUrl } from "@/lib/backendUrl";
import styles from "./page.module.css";

type LedgerEventApiRecord = {
  event_type: "transaction" | "transfer";
  id: number;
  date: string;
  amount_cents: number;
  transaction_type: "normal" | "adjustment" | "transfer";
  merchant: string | null;
  note: string | null;
  account_id: number | null;
  account_name: string | null;
  receipt_id: number | null;
  category_id: number | null;
  category_name: string | null;
  from_account_id: number | null;
  from_account_name: string | null;
  to_account_id: number | null;
  to_account_name: string | null;
};

type TransactionLoadResult = {
  count: number;
  data: LedgerEventApiRecord[];
  error: string | null;
  pageOutOfRange: boolean;
};

type LedgerEventPageApiResponse = {
  count: number;
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
  accountError: string | null;
  accounts: Array<{ id: number; isLiability: boolean; name: string }>;
  categories: Array<{ id: number; name: string }>;
  categoryError: string | null;
  categoryFilters: Array<{ id: number; name: string }>;
  error: string | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  signDisplay: "always",
});

const neutralCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const ledgerEventPageSize = 20;

async function getTransactions(
  category: string,
  page: number,
  search: string,
  sort: string,
): Promise<TransactionLoadResult> {
  try {
    const cookieStore = await cookies();
    const query = new URLSearchParams({ page: String(page) });

    if (search) {
      query.set("search", search);
    }

    if (sort !== "latest") {
      query.set("sort", sort);
    }

    if (category !== "all") {
      query.set("category", category);
    }

    const response = await fetch(backendUrl(`/api/ledger-events/?${query}`), {
      headers: {
        cookie: cookieStore.toString(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const pageOutOfRange = response.status === 404 && page > 1;

      return {
        count: 0,
        data: [],
        error: pageOutOfRange ? null : "Unable to load transactions right now.",
        pageOutOfRange,
      };
    }

    const data: unknown = await response.json();

    if (
      typeof data !== "object" ||
      data === null ||
      !("count" in data) ||
      typeof data.count !== "number" ||
      !("results" in data) ||
      !Array.isArray(data.results)
    ) {
      return {
        count: 0,
        data: [],
        error: "The transaction service returned an unexpected response.",
        pageOutOfRange: false,
      };
    }

    const pageData = data as LedgerEventPageApiResponse;
    return {
      count: pageData.count,
      data: pageData.results,
      error: null,
      pageOutOfRange: false,
    };
  } catch {
    return {
      count: 0,
      data: [],
      error: "Unable to load transactions right now.",
      pageOutOfRange: false,
    };
  }
}

async function getTransactionFormOptions(): Promise<TransactionFormOptions> {
  const cookieStore = await cookies();
  const headers = { cookie: cookieStore.toString() };
  const [accountResult, categoryResult] = await Promise.all([
    (async () => {
      try {
        const response = await fetch(backendUrl("/api/accounts/"), {
          headers,
          cache: "no-store",
        });
        const data: unknown = response.ok ? await response.json() : null;

        if (!response.ok || !Array.isArray(data)) {
          throw new Error();
        }

        return {
          data: (data as AccountOptionApiRecord[]).map((account) => ({
            id: account.id,
            isLiability: account.is_liability,
            name: account.name,
          })),
          error: null,
        };
      } catch {
        return {
          data: [],
          error: "Unable to load account options right now.",
        };
      }
    })(),
    (async () => {
      try {
        const response = await fetch(backendUrl("/api/categories/"), {
          headers,
          cache: "no-store",
        });
        const data: unknown = response.ok ? await response.json() : null;

        if (!response.ok || !Array.isArray(data)) {
          throw new Error();
        }

        const categoryOptions = (data as CategoryOptionApiRecord[]).map(
          (category) => ({ id: category.id, name: category.name }),
        );

        return {
          categories: (data as CategoryOptionApiRecord[])
            .filter((category) => !category.is_archived)
            .map((category) => ({ id: category.id, name: category.name })),
          categoryFilters: categoryOptions,
          error: null,
        };
      } catch {
        return {
          categories: [],
          categoryFilters: [],
          error: "Unable to load category options right now.",
        };
      }
    })(),
  ]);

  return {
    accountError: accountResult.error,
    accounts: accountResult.data,
    categories: categoryResult.categories,
    categoryError: categoryResult.error,
    categoryFilters: categoryResult.categoryFilters,
    error: accountResult.error ?? categoryResult.error,
  };
}

function formatAmount(amountCents: number) {
  return currencyFormatter.format(amountCents / 100);
}

function formatEventAmount(event: LedgerEventApiRecord) {
  if (event.event_type === "transfer") {
    return neutralCurrencyFormatter.format(event.amount_cents / 100);
  }

  return formatAmount(event.amount_cents);
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
const sortValues = new Set(sortOptions.map((option) => option.value));

type TransactionsPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    page?: string | string[];
    search?: string | string[];
    sort?: string | string[];
  }>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawCategory = resolvedSearchParams.category;
  const rawPage = resolvedSearchParams.page;
  const rawSearch = resolvedSearchParams.search;
  const rawSort = resolvedSearchParams.sort;
  const parsedPage = typeof rawPage === "string" ? Number(rawPage) : 1;
  const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const category =
    typeof rawCategory === "string" && /^\d+$/.test(rawCategory) && Number(rawCategory) > 0
      ? rawCategory
      : "all";
  const search = typeof rawSearch === "string" ? rawSearch.trim() : "";
  const sort =
    typeof rawSort === "string" && sortValues.has(rawSort) ? rawSort : "latest";
  const [transactionResult, formOptions] = await Promise.all([
    getTransactions(category, currentPage, search, sort),
    getTransactionFormOptions(),
  ]);

  if (transactionResult.pageOutOfRange) {
    const query = new URLSearchParams();

    if (search) {
      query.set("search", search);
    }

    if (sort !== "latest") {
      query.set("sort", sort);
    }

    if (category !== "all") {
      query.set("category", category);
    }

    const redirectQuery = query.toString();
    redirect(redirectQuery ? `/transactions?${redirectQuery}` : "/transactions");
  }

  const { count, data: transactions, error } = transactionResult;
  const totalPages = Math.ceil(count / ledgerEventPageSize);
  const categoryOptions = [
    { label: "All Transactions", value: "all" },
    ...formOptions.categoryFilters.map((option) => ({
      label: option.name,
      value: String(option.id),
    })),
  ];
  return (
    <AppShell
      title="Transactions"
      headerAction={
        <TransactionCreateControl
          accountError={formOptions.accountError}
          accounts={formOptions.accounts}
          categories={formOptions.categories}
          categoryError={formOptions.categoryError}
        />
      }
    >
      <section className={styles.panel} aria-label="Transactions list and controls">
        <div className={styles.toolbar} aria-label="Transaction controls">
          <form className={styles.searchField} action="/transactions" method="get">
            {category !== "all" ? (
              <input name="category" type="hidden" value={category} />
            ) : null}
            {sort !== "latest" ? <input name="sort" type="hidden" value={sort} /> : null}
            <label className={styles.visuallyHidden} htmlFor="transaction-search">
              Search transactions
            </label>
            <input
              className={styles.searchInput}
              defaultValue={search}
              id="transaction-search"
              name="search"
              type="search"
              placeholder="Search transaction"
            />
            <span className={styles.searchIcon} aria-hidden="true" />
          </form>

          <div className={styles.filters}>
            <div className={styles.filterControl}>
              <span className={styles.filterLabel}>Sort by</span>
              <SortDropdown
                ariaLabel="Sort transactions"
                options={sortOptions}
                queryParam="sort"
                value={sort}
              />
            </div>

            <div className={styles.filterControl}>
              <span className={styles.filterLabel}>Category</span>
              <SortDropdown
                ariaLabel="Filter transactions by category"
                minWidth="wide"
                options={categoryOptions}
                queryParam="category"
                value={category}
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
            <p className={styles.stateMessage}>
              {search || category !== "all"
                ? "No transactions match your filters."
                : "No transactions yet."}
            </p>
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
                        transaction.event_type === "transaction" &&
                        transaction.amount_cents > 0
                          ? styles.amountPositive
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {formatEventAmount(transaction)}
                    </p>
                    {transaction.event_type === "transaction" &&
                    transaction.receipt_id !== null ? (
                      <ReceiptDeleteControl
                        receipt={{ id: transaction.receipt_id, name }}
                      />
                    ) : transaction.event_type === "transaction" &&
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
                          date: transaction.date,
                          id: transaction.id,
                          merchant: transaction.merchant,
                          name,
                          note: transaction.note,
                          signedAmountCents: transaction.amount_cents,
                        }}
                      />
                    ) : transaction.event_type === "transfer" &&
                      transaction.from_account_id !== null &&
                      transaction.to_account_id !== null ? (
                      <TransferActionControl
                        accountError={formOptions.accountError}
                        accounts={formOptions.accounts}
                        transfer={{
                          amountCents: transaction.amount_cents,
                          date: transaction.date,
                          fromAccountId: transaction.from_account_id,
                          id: transaction.id,
                          name,
                          note: transaction.note,
                          toAccountId: transaction.to_account_id,
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

        {!error && totalPages > 1 ? (
          <Pagination
            currentPage={currentPage}
            mobileCompact
            pageQueryParam="page"
            totalPages={totalPages}
          />
        ) : null}
      </section>
    </AppShell>
  );
}
