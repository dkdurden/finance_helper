import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { AccountCreateControl } from "@/features/accounts/components/AccountCreateControl";
import { AccountEditControl } from "@/features/accounts/components/AccountEditControl";
import type { AccountType } from "@/features/accounts/components/AccountModal";
import { backendUrl } from "@/lib/backendUrl";
import styles from "./page.module.css";


type AccountApiRecord = {
  id: number;
  name: string;
  account_type: AccountType;
  is_liability: boolean;
  balance_cents: number;
};

type AccountLoadResult = {
  data: AccountApiRecord[];
  error: string | null;
};

const accountTypeLabels: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  cash: "Cash",
  credit_card: "Credit Card",
  loan: "Loan",
  investment: "Investment",
  other: "Other",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

async function getAccounts(): Promise<AccountLoadResult> {
  try {
    const cookieStore = await cookies();
    const response = await fetch(backendUrl("/api/accounts/"), {
      headers: {
        cookie: cookieStore.toString(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { data: [], error: "Unable to load accounts right now." };
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      return { data: [], error: "The account service returned an unexpected response." };
    }

    return { data: data as AccountApiRecord[], error: null };
  } catch {
    return { data: [], error: "Unable to load accounts right now." };
  }
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "A";
}

function formatBalance(balanceCents: number) {
  return currencyFormatter.format(balanceCents / 100);
}

export default async function AccountsPage() {
  const { data: accounts, error } = await getAccounts();

  return (
    <AppShell title="Accounts" headerAction={<AccountCreateControl />}>
      <section className={styles.panel} aria-label="Account list">
        <div className={styles.tableHeader} aria-hidden="true">
          <span>Account</span>
          <span>Type</span>
          <span>Classification</span>
          <span className={styles.balanceHeader}>Balance</span>
          <span className={styles.actionsHeader}>Actions</span>
        </div>

        <div className={styles.accountList}>
          {error ? (
            <p className={`${styles.stateMessage} ${styles.errorMessage}`} role="alert">
              {error}
            </p>
          ) : accounts.length === 0 ? (
            <p className={styles.stateMessage}>No accounts yet. Add one to start tracking balances.</p>
          ) : (
            accounts.map((account) => (
              <article className={styles.accountRow} key={account.id}>
                <div className={styles.accountIdentity}>
                  <span className={styles.accountInitials} aria-hidden="true">
                    {getInitials(account.name)}
                  </span>
                  <p className={styles.accountName}>{account.name}</p>
                </div>
                <p className={styles.accountType}>{accountTypeLabels[account.account_type]}</p>
                <p className={styles.classification}>
                  {account.is_liability ? "Liability" : "Asset"}
                </p>
                <p className={styles.balance}>{formatBalance(account.balance_cents)}</p>
                <div className={styles.accountActions}>
                  <AccountEditControl
                    account={{
                      id: account.id,
                      name: account.name,
                      accountType: account.account_type,
                      isLiability: account.is_liability,
                    }}
                  />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
