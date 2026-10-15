"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/button/Button";
import { InputField } from "@/components/input/InputField";
import { getCurrentCalendarDate } from "@/lib/date";
import styles from "./AccountCreateControl.module.css";

type AccountAdjustmentModalProps = {
  account: {
    balanceCents: number;
    id: number;
    isLiability: boolean;
    name: string;
  };
  onClose: () => void;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function getErrorMessage(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const message = value.find((item) => typeof item === "string");
    return typeof message === "string"
      ? message
      : "Unable to adjust the account balance.";
  }

  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      const message = getErrorMessage(field);

      if (message !== "Unable to adjust the account balance.") {
        return message;
      }
    }
  }

  return "Unable to adjust the account balance.";
}

export function AccountAdjustmentModal({
  account,
  onClose,
}: AccountAdjustmentModalProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const amountId = useId();
  const dateId = useId();
  const [targetBalance, setTargetBalance] = useState(
    (account.balanceCents / 100).toFixed(2),
  );
  const [adjustmentDate, setAdjustmentDate] = useState(getCurrentCalendarDate);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!targetBalance.trim()) {
      setErrorMessage("Enter the account’s reported balance.");
      return;
    }

    const targetBalanceDollars = Number(targetBalance);
    const targetBalanceCents = Math.round(targetBalanceDollars * 100);

    if (
      !Number.isFinite(targetBalanceDollars) ||
      !Number.isSafeInteger(targetBalanceCents)
    ) {
      setErrorMessage("Enter a valid reported balance.");
      return;
    }

    if (!adjustmentDate) {
      setErrorMessage("Choose an adjustment date.");
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

      const response = await fetch(
        `/api/accounts/${account.id}/adjust-balance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_balance_cents: targetBalanceCents,
            date: adjustmentDate,
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
        error instanceof Error
          ? error.message
          : "Unable to adjust the account balance.",
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
            Adjust {account.name}
          </h2>
          <button
            className={styles.closeButton}
            type="button"
            aria-label="Close Adjust Balance modal"
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
          Enter the balance currently reported for this account. The tracked
          balance is {currencyFormatter.format(account.balanceCents / 100)}.
          {account.isLiability
            ? " For this liability, enter the amount currently owed."
            : ""}
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <InputField
            autoFocus
            fieldClassName={styles.inputField}
            helperText=""
            id={amountId}
            inputMode="decimal"
            label={account.isLiability ? "Reported Amount Owed" : "Reported Balance"}
            prefix="$"
            required
            step="0.01"
            type="number"
            value={targetBalance}
            onChange={(event) => setTargetBalance(event.target.value)}
          />

          <InputField
            fieldClassName={styles.inputField}
            helperText=""
            id={dateId}
            label="Adjustment Date"
            required
            type="date"
            value={adjustmentDate}
            onChange={(event) => setAdjustmentDate(event.target.value)}
          />

          {errorMessage ? (
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>
          ) : null}

          <Button
            className={styles.submitButton}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving Adjustment..." : "Save Adjustment"}
          </Button>
        </form>
      </div>
    </div>
  );
}
