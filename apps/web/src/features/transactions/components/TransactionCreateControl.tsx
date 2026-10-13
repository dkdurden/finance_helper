"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/button/Button";
import { InputField } from "@/components/input/InputField";
import { SelectField, type SelectOption } from "@/components/input/SelectField";
import modalStyles from "@/features/accounts/components/AccountCreateControl.module.css";
import {
  TransactionAmountField,
  getSignedAmountCents,
  type TransactionDirection,
} from "./TransactionAmountField";
import {
  TransactionCategoryField,
  type TransactionCategory,
} from "./TransactionCategoryField";
import styles from "./TransactionCreateControl.module.css";

export type TransactionAccountOption = {
  id: number;
  isLiability: boolean;
  name: string;
};

type TransactionCreateControlProps = {
  accounts: TransactionAccountOption[];
  categories: TransactionCategory[];
  optionsError?: string | null;
};

type EntryType = "transaction" | "transfer";

function getErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const message = value.find((item) => typeof item === "string");
    return typeof message === "string" ? message : fallback;
  }

  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      const message = getErrorMessage(field, fallback);

      if (message !== fallback) {
        return message;
      }
    }
  }

  return fallback;
}

function getLocalDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

export function TransactionCreateControl({
  accounts,
  categories: initialCategories,
  optionsError = null,
}: TransactionCreateControlProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const accountSelectId = useId();
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>("transaction");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getLocalDate);
  const [direction, setDirection] = useState<TransactionDirection>("decrease");
  const [merchant, setMerchant] = useState("");
  const [categoryPending, setCategoryPending] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAccount =
    accounts.find((account) => account.id === accountId) ?? null;
  const accountOptions = useMemo<SelectOption[]>(
    () =>
      accounts.map((account) => ({
        color: account.isLiability ? "var(--color-red)" : "var(--color-cyan)",
        label: account.name,
        value: String(account.id),
      })),
    [accounts],
  );
  const entryTypeOptions = useMemo<SelectOption[]>(
    () => [
      {
        color: "var(--color-green)",
        label: "Transaction",
        value: "transaction",
      },
      {
        color: "var(--color-cyan)",
        label: "Transfer",
        value: "transfer",
      },
    ],
    [],
  );

  const closeModal = useCallback(() => {
    if (categoryPending || isSubmitting) {
      return;
    }

    setModalOpen(false);
    requestAnimationFrame(() => {
      triggerWrapRef.current?.querySelector("button")?.focus();
    });
  }, [categoryPending, isSubmitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const signedAmountCents = getSignedAmountCents(
      amount,
      entryType === "transfer" ? "increase" : direction,
    );

    if (accountId === null) {
      setErrorMessage(
        entryType === "transfer" ? "Select a source account." : "Select an account.",
      );
      return;
    }

    if (entryType === "transaction" && categoryId === null) {
      setErrorMessage("Select a category.");
      return;
    }

    if (entryType === "transfer" && toAccountId === null) {
      setErrorMessage("Select a destination account.");
      return;
    }

    if (entryType === "transfer" && accountId === toAccountId) {
      setErrorMessage("Choose two different accounts for the transfer.");
      return;
    }

    if (signedAmountCents === null) {
      setErrorMessage("Enter a valid amount greater than zero with up to two decimal places.");
      return;
    }

    if (!date) {
      setErrorMessage("Select a date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        method: "GET",
        cache: "no-store",
      });

      if (!csrfResponse.ok) {
        throw new Error("Unable to initialize transaction security.");
      }

      const response = await fetch(
        entryType === "transfer" ? "/api/transfers" : "/api/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            entryType === "transfer"
              ? {
                  amount_cents: signedAmountCents,
                  date,
                  from_account: accountId,
                  to_account: toAccountId,
                }
              : {
                  account: accountId,
                  category: categoryId,
                  date,
                  merchant: merchant.trim() || null,
                  signed_amount_cents: signedAmountCents,
                  transaction_type: "normal",
                },
          ),
        },
      );

      let responseData: unknown = null;

      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        setErrorMessage(
          getErrorMessage(
            responseData,
            entryType === "transfer"
              ? "Unable to add the transfer."
              : "Unable to add the transaction.",
          ),
        );
        return;
      }

      setModalOpen(false);
      setEntryType("transaction");
      setAccountId(null);
      setToAccountId(null);
      setCategoryId(null);
      setAmount("");
      setDate(getLocalDate());
      setDirection("decrease");
      setMerchant("");
      router.refresh();
      requestAnimationFrame(() => {
        triggerWrapRef.current?.querySelector("button")?.focus();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : entryType === "transfer"
            ? "Unable to add the transfer."
            : "Unable to add the transaction.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    document.getElementById(accountSelectId)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [accountSelectId, closeModal, modalOpen]);

  return (
    <div ref={triggerWrapRef}>
      <Button onClick={() => setModalOpen(true)}>+ Add Transaction</Button>

      {modalOpen ? (
        <div
          className={modalStyles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className={modalStyles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            <header className={modalStyles.header}>
              <h2 className={modalStyles.title} id={titleId}>
                Add Transaction
              </h2>
              <button
                className={modalStyles.closeButton}
                type="button"
                aria-label="Close Add Transaction modal"
                disabled={categoryPending || isSubmitting}
                onClick={closeModal}
              >
                <Image
                  src="/images/icon-close-modal.svg"
                  alt=""
                  width={32}
                  height={32}
                  aria-hidden="true"
                />
              </button>
            </header>

            <form className={styles.content} onSubmit={handleSubmit}>
              <p className={modalStyles.description} id={descriptionId}>
                {entryType === "transfer"
                  ? "Choose the source, destination, and amount for this transfer."
                  : "Choose an account, category, and amount for this transaction."}
              </p>

              <div className={styles.controls}>
                <SelectField
                  helperText=""
                  label="Entry type"
                  options={entryTypeOptions}
                  value={entryType}
                  onChange={(event) => {
                    setEntryType(event.target.value as EntryType);
                    setErrorMessage(null);
                  }}
                />

                <InputField
                  disabled={categoryPending || isSubmitting}
                  helperText=""
                  label="Date"
                  required
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />

                <SelectField
                  className={styles.accountField}
                  disabled={categoryPending || isSubmitting || accounts.length === 0}
                  helperText=""
                  id={accountSelectId}
                  label={entryType === "transfer" ? "From account" : "Account"}
                  noneLabel={accounts.length === 0 ? "Add an account first" : "Select an account"}
                  options={accountOptions}
                  placeholder={accounts.length === 0 ? "Add an account first" : "Select an account"}
                  required
                  value={accountId === null ? "" : String(accountId)}
                  onChange={(event) => {
                    const nextAccount = accounts.find(
                      (account) => account.id === Number(event.target.value),
                    );

                    setAccountId(nextAccount?.id ?? null);
                    if (entryType === "transfer" && nextAccount?.id === toAccountId) {
                      setToAccountId(null);
                    }
                    setDirection(nextAccount?.isLiability ? "increase" : "decrease");
                  }}
                />

                {entryType === "transfer" ? (
                  <>
                    <SelectField
                      disabled={isSubmitting || accounts.length < 2}
                      helperText=""
                      label="To account"
                      noneLabel={
                        accounts.length < 2
                          ? "Add another account first"
                          : "Select an account"
                      }
                      options={accountOptions.filter(
                        (account) => account.value !== String(accountId),
                      )}
                      placeholder={
                        accounts.length < 2
                          ? "Add another account first"
                          : "Select an account"
                      }
                      required
                      value={toAccountId === null ? "" : String(toAccountId)}
                      onChange={(event) => {
                        const nextAccountId = Number(event.target.value);
                        setToAccountId(
                          accounts.some((account) => account.id === nextAccountId)
                            ? nextAccountId
                            : null,
                        );
                      }}
                    />

                    <InputField
                      disabled={isSubmitting}
                      helperText="Enter a positive amount with up to two decimal places."
                      inputMode="decimal"
                      label="Amount"
                      prefix="$"
                      required
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </>
                ) : (
                  <>
                    <InputField
                      disabled={categoryPending || isSubmitting}
                      helperText="Optional. Used as the transaction name in the ledger."
                      label="Merchant"
                      maxLength={255}
                      value={merchant}
                      onChange={(event) => setMerchant(event.target.value)}
                    />

                    <TransactionCategoryField
                      categories={categories}
                      disabled={categoryPending || isSubmitting}
                      value={categoryId}
                      onCategoryCreated={(category) => {
                        setCategories((current) => [...current, category]);
                      }}
                      onPendingChange={setCategoryPending}
                      onValueChange={setCategoryId}
                    />

                    <TransactionAmountField
                      account={selectedAccount}
                      amount={amount}
                      direction={direction}
                      disabled={categoryPending || isSubmitting}
                      onAmountChange={setAmount}
                      onDirectionChange={setDirection}
                    />
                  </>
                )}
              </div>

              {optionsError ? (
                <p className={`${styles.statusMessage} ${styles.errorMessage}`} role="alert">
                  {optionsError}
                </p>
              ) : null}

              {errorMessage ? (
                <p className={`${styles.statusMessage} ${styles.errorMessage}`} role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={
                  categoryPending ||
                  isSubmitting ||
                  accounts.length < (entryType === "transfer" ? 2 : 1) ||
                  optionsError !== null
                }
              >
                {isSubmitting
                  ? entryType === "transfer"
                    ? "Adding Transfer..."
                    : "Adding Transaction..."
                  : entryType === "transfer"
                    ? "Add Transfer"
                    : "Add Transaction"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
