"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/button/Button";
import { SelectField, type SelectOption } from "@/components/input/SelectField";
import modalStyles from "@/features/accounts/components/AccountCreateControl.module.css";
import {
  TransactionAmountField,
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

export function TransactionCreateControl({
  accounts,
  categories: initialCategories,
  optionsError = null,
}: TransactionCreateControlProps) {
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
    if (categoryPending) {
      return;
    }

    setModalOpen(false);
    requestAnimationFrame(() => {
      triggerWrapRef.current?.querySelector("button")?.focus();
    });
  }, [categoryPending]);

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
                disabled={categoryPending}
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

            <div className={styles.content}>
              <p className={modalStyles.description} id={descriptionId}>
                Choose an account, category, and amount for this transaction.
              </p>

              <div className={styles.controls}>
                <SelectField
                  className={styles.accountField}
                  disabled={categoryPending || accounts.length === 0}
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
                  disabled={categoryPending}
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
                  disabled={categoryPending}
                  onAmountChange={setAmount}
                  onDirectionChange={setDirection}
                />
              </div>

              {optionsError ? (
                <p className={`${styles.statusMessage} ${styles.errorMessage}`} role="alert">
                  {optionsError}
                </p>
              ) : null}

              <p className={styles.statusMessage} role="status">
                Transaction saving will be connected in the next implementation step.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
