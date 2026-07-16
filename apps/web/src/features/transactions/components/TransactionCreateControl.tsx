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

function getErrorMessage(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const message = value.find((item) => typeof item === "string");
    return typeof message === "string" ? message : "Unable to add the transaction.";
  }

  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      const message = getErrorMessage(field);

      if (message !== "Unable to add the transaction.") {
        return message;
      }
    }
  }

  return "Unable to add the transaction.";
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
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<TransactionDirection>("decrease");
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

    const signedAmountCents = getSignedAmountCents(amount, direction);

    if (accountId === null) {
      setErrorMessage("Select an account.");
      return;
    }

    if (categoryId === null) {
      setErrorMessage("Select a category.");
      return;
    }

    if (signedAmountCents === null) {
      setErrorMessage("Enter a valid amount greater than zero with up to two decimal places.");
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

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account: accountId,
          category: categoryId,
          date: getLocalDate(),
          signed_amount_cents: signedAmountCents,
          transaction_type: "normal",
        }),
      });

      let responseData: unknown = null;

      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        setErrorMessage(getErrorMessage(responseData));
        return;
      }

      setModalOpen(false);
      setAccountId(null);
      setCategoryId(null);
      setAmount("");
      setDirection("decrease");
      router.refresh();
      requestAnimationFrame(() => {
        triggerWrapRef.current?.querySelector("button")?.focus();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to add the transaction.",
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
                Choose an account, category, and amount for this transaction.
              </p>

              <div className={styles.controls}>
                <SelectField
                  className={styles.accountField}
                  disabled={categoryPending || isSubmitting || accounts.length === 0}
                  helperText=""
                  id={accountSelectId}
                  label="Account"
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
                    setDirection(nextAccount?.isLiability ? "increase" : "decrease");
                  }}
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
                  accounts.length === 0 ||
                  optionsError !== null
                }
              >
                {isSubmitting ? "Adding Transaction..." : "Add Transaction"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
