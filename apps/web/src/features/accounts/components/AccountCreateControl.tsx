"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
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

type AccountType = (typeof accountTypes)[number]["value"];

function defaultsToLiability(accountType: AccountType) {
  return accountType === "credit_card" || accountType === "loan";
}

function getErrorMessage(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const message = value.find((item) => typeof item === "string");
    return typeof message === "string" ? message : "Unable to create the account.";
  }

  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      const message = getErrorMessage(field);

      if (message !== "Unable to create the account.") {
        return message;
      }
    }
  }

  return "Unable to create the account.";
}

export function AccountCreateControl() {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const nameId = useId();
  const accountTypeId = useId();
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [openingBalance, setOpeningBalance] = useState("0.00");
  const [isLiability, setIsLiability] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setAccountType("checking");
    setOpeningBalance("0.00");
    setIsLiability(false);
    setErrorMessage(null);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    resetForm();
    requestAnimationFrame(() => {
      triggerWrapRef.current?.querySelector("button")?.focus();
    });
  }, [resetForm]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.getElementById(nameId)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeModal, isOpen, isSubmitting, nameId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const balanceDollars = Number(openingBalance);
    const openingBalanceCents = Math.round(balanceDollars * 100);

    if (!trimmedName) {
      setErrorMessage("Enter an account name.");
      return;
    }

    if (!Number.isFinite(balanceDollars) || !Number.isSafeInteger(openingBalanceCents)) {
      setErrorMessage("Enter a valid opening balance.");
      return;
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

      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          account_type: accountType,
          is_liability: isLiability,
          opening_balance_cents: openingBalanceCents,
          opening_balance_date: new Date().toISOString(),
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

      closeModal();
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create the account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div ref={triggerWrapRef}>
      <Button onClick={() => setIsOpen(true)}>+ Add Account</Button>

      {isOpen ? (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              closeModal();
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
              <h2 className={styles.title} id={titleId}>Add Account</h2>
              <button
                className={styles.closeButton}
                type="button"
                aria-label="Close Add Account modal"
                disabled={isSubmitting}
                onClick={closeModal}
              >
                <Image src="/images/icon-close-modal.svg" alt="" width={32} height={32} aria-hidden="true" />
              </button>
            </header>

            <p className={styles.description} id={descriptionId}>
              Add an account and its balance when you started tracking it here.
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
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </span>
              </label>

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

              {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}

              <Button className={styles.submitButton} type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding Account..." : "Add Account"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
