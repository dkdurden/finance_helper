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
import type { TransactionAccountOption } from "./TransactionCreateControl";
import formStyles from "./TransactionCreateControl.module.css";
import styles from "./TransactionEditControl.module.css";

export type EditableTransaction = {
  accountId: number;
  categoryId: number;
  categoryName: string;
  id: number;
  name: string;
  signedAmountCents: number;
};

type TransactionEditControlProps = {
  accounts: TransactionAccountOption[];
  categories: TransactionCategory[];
  optionsError?: string | null;
  transaction: EditableTransaction;
};

type TransactionEditModalProps = TransactionEditControlProps & {
  onClose: () => void;
};

function getErrorMessage(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const message = value.find((item) => typeof item === "string");
    return typeof message === "string" ? message : "Unable to update the transaction.";
  }

  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      const message = getErrorMessage(field);

      if (message !== "Unable to update the transaction.") {
        return message;
      }
    }
  }

  return "Unable to update the transaction.";
}

function formatAmountForInput(amountCents: number) {
  return (Math.abs(amountCents) / 100).toFixed(2);
}

function TransactionEditModal({
  accounts,
  categories,
  onClose,
  optionsError = null,
  transaction,
}: TransactionEditModalProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const accountSelectId = useId();
  const [accountId, setAccountId] = useState<number | null>(transaction.accountId);
  const [categoryId, setCategoryId] = useState<number | null>(transaction.categoryId);
  const [amount, setAmount] = useState(() =>
    formatAmountForInput(transaction.signedAmountCents),
  );
  const [direction, setDirection] = useState<TransactionDirection>(
    transaction.signedAmountCents > 0 ? "increase" : "decrease",
  );
  const [categoryPending, setCategoryPending] = useState(false);
  const [availableCategories, setAvailableCategories] = useState(() =>
    categories.some((category) => category.id === transaction.categoryId)
      ? categories
      : [
          ...categories,
          { id: transaction.categoryId, name: transaction.categoryName },
        ],
  );
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
    if (!categoryPending && !isSubmitting) {
      onClose();
    }
  }, [categoryPending, isSubmitting, onClose]);

  useEffect(() => {
    document.getElementById(accountSelectId)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [accountSelectId, closeModal]);

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

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account: accountId,
          category: categoryId,
          signed_amount_cents: signedAmountCents,
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

      onClose();
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update the transaction.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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
            Edit Transaction
          </h2>
          <button
            className={modalStyles.closeButton}
            type="button"
            aria-label="Close Edit Transaction modal"
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

        <form className={formStyles.content} onSubmit={handleSubmit}>
          <p className={modalStyles.description} id={descriptionId}>
            Update the account, category, and amount. The transaction date and
            other details will stay unchanged.
          </p>

          <div className={formStyles.controls}>
            <SelectField
              className={formStyles.accountField}
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
              }}
            />

            <TransactionCategoryField
              categories={availableCategories}
              disabled={categoryPending || isSubmitting}
              value={categoryId}
              onCategoryCreated={(category) => {
                setAvailableCategories((current) => [...current, category]);
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
            <p
              className={`${formStyles.statusMessage} ${formStyles.errorMessage}`}
              role="alert"
            >
              {optionsError}
            </p>
          ) : null}

          {errorMessage ? (
            <p
              className={`${formStyles.statusMessage} ${formStyles.errorMessage}`}
              role="alert"
            >
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
            {isSubmitting ? "Saving Changes..." : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function TransactionEditControl({
  accounts,
  categories,
  optionsError = null,
  transaction,
}: TransactionEditControlProps) {
  const menuId = useId();
  const controlRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (controlRef.current && !controlRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className={styles.actions} ref={controlRef}>
      <button
        ref={menuButtonRef}
        className={styles.moreButton}
        type="button"
        aria-controls={menuId}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Open ${transaction.name} transaction actions`}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <Image
          src="/images/icon-ellipsis.svg"
          alt=""
          width={16}
          height={16}
          aria-hidden="true"
        />
      </button>

      {menuOpen ? (
        <div className={styles.actionsMenu} id={menuId} role="menu">
          <button
            className={styles.actionsMenuItem}
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setModalOpen(true);
            }}
          >
            Edit Transaction
          </button>
        </div>
      ) : null}

      {modalOpen ? (
        <TransactionEditModal
          accounts={accounts}
          categories={categories}
          optionsError={optionsError}
          transaction={transaction}
          onClose={closeModal}
        />
      ) : null}
    </div>
  );
}
