"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/button/Button";
import { InputField } from "@/components/input/InputField";
import styles from "./AccountCreateControl.module.css";

const accountTypes = [
  { label: "Checking", value: "checking" },
  { label: "Savings", value: "savings" },
  { label: "Cash", value: "cash" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Loan", value: "loan" },
  { label: "Investment", value: "investment" },
  { label: "Other", value: "other" },
] as const;

export type AccountType = (typeof accountTypes)[number]["value"];

export type EditableAccount = {
  id: number;
  name: string;
  accountType: AccountType;
  isLiability: boolean;
};

type AccountModalProps = {
  account?: EditableAccount;
  mode: "create" | "edit";
  onClose: () => void;
};

function defaultsToLiability(accountType: AccountType) {
  return accountType === "credit_card" || accountType === "loan";
}

function getErrorMessage(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const message = value.find((item) => typeof item === "string");
    return typeof message === "string" ? message : "Unable to save the account.";
  }

  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      const message = getErrorMessage(field);

      if (message !== "Unable to save the account.") {
        return message;
      }
    }
  }

  return "Unable to save the account.";
}

export function AccountModal({ account, mode, onClose }: AccountModalProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const nameId = useId();
  const accountTypeId = useId();
  const [name, setName] = useState(account?.name ?? "");
  const [accountType, setAccountType] = useState<AccountType>(
    account?.accountType ?? "checking",
  );
  const [openingBalance, setOpeningBalance] = useState("0.00");
  const [isLiability, setIsLiability] = useState(account?.isLiability ?? false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = mode === "edit";
  const title = isEditing ? "Edit Account" : "Add Account";

  useEffect(() => {
    document.getElementById(nameId)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, nameId, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage("Enter an account name.");
      return;
    }

    let openingBalanceCents: number | null = null;

    if (!isEditing) {
      const balanceDollars = Number(openingBalance);
      openingBalanceCents = Math.round(balanceDollars * 100);

      if (!Number.isFinite(balanceDollars) || !Number.isSafeInteger(openingBalanceCents)) {
        setErrorMessage("Enter a valid opening balance.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        method: "GET",
        cache: "no-store",
      });

      if (!csrfResponse.ok) {
        throw new Error("Unable to initialize account security.");
      }

      const response = await fetch(
        isEditing ? `/api/accounts/${account?.id}` : "/api/accounts",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
            account_type: accountType,
            is_liability: isLiability,
            ...(!isEditing
              ? {
                  opening_balance_cents: openingBalanceCents,
                  opening_balance_date: new Date().toISOString(),
                }
              : {}),
          }),
        },
      );

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
        error instanceof Error ? error.message : "Unable to save the account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <button
            className={styles.closeButton}
            type="button"
            aria-label={`Close ${title} modal`}
            disabled={isSubmitting}
            onClick={onClose}
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

        <p className={styles.description} id={descriptionId}>
          {isEditing
            ? "Update account details. Balance corrections are recorded separately as adjustments."
            : "Add an account and its balance when you started tracking it here."}
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <InputField
            fieldClassName={styles.inputField}
            helperText=""
            id={nameId}
            label="Account Name"
            maxLength={100}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <label className={styles.field} htmlFor={accountTypeId}>
            <span className={styles.label}>Account Type</span>
            <span className={styles.selectWrap}>
              <select
                className={styles.select}
                id={accountTypeId}
                value={accountType}
                onChange={(event) => {
                  const nextType = event.target.value as AccountType;
                  setAccountType(nextType);
                  setIsLiability(defaultsToLiability(nextType));
                }}
              >
                {accountTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </span>
          </label>

          {!isEditing ? (
            <InputField
              fieldClassName={styles.inputField}
              helperText=""
              inputMode="decimal"
              label="Opening Balance"
              prefix="$"
              required
              value={openingBalance}
              onChange={(event) => setOpeningBalance(event.target.value)}
            />
          ) : null}

          <label className={styles.checkboxField}>
            <input
              className={styles.checkbox}
              type="checkbox"
              checked={isLiability}
              onChange={(event) => setIsLiability(event.target.checked)}
            />
            <span>
              <span className={styles.checkboxLabel}>Account is a liability</span>
              <span className={styles.checkboxHint}>
                Liability balances represent an amount owed.
              </span>
            </span>
          </label>

          {errorMessage ? (
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>
          ) : null}

          <Button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Saving Changes..."
                : "Adding Account..."
              : isEditing
                ? "Save Changes"
                : "Add Account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
