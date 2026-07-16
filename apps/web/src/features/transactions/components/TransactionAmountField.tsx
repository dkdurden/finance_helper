"use client";

import { useId } from "react";
import { InputField } from "@/components/input/InputField";
import styles from "./TransactionAmountField.module.css";

export type TransactionDirection = "decrease" | "increase";

type TransactionAmountAccount = {
  isLiability: boolean;
  name: string;
};

type TransactionAmountFieldProps = {
  account: TransactionAmountAccount | null;
  amount: string;
  direction: TransactionDirection;
  disabled?: boolean;
  onAmountChange: (amount: string) => void;
  onDirectionChange: (direction: TransactionDirection) => void;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function getSignedAmountCents(
  amount: string,
  direction: TransactionDirection,
) {
  const normalizedAmount = amount.trim();

  if (!/^\d+(?:\.\d{0,2})?$/.test(normalizedAmount)) {
    return null;
  }

  const amountCents = Math.round(Number(normalizedAmount) * 100);

  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return null;
  }

  return direction === "increase" ? amountCents : -amountCents;
}

export function TransactionAmountField({
  account,
  amount,
  direction,
  disabled = false,
  onAmountChange,
  onDirectionChange,
}: TransactionAmountFieldProps) {
  const directionName = useId();
  const signedAmountCents = getSignedAmountCents(amount, direction);
  const directionOptions: Array<{
    label: string;
    value: TransactionDirection;
  }> = account?.isLiability
    ? [
        { label: "Charge", value: "increase" },
        { label: "Payment or refund", value: "decrease" },
      ]
    : [
        { label: "Money out", value: "decrease" },
        { label: "Money in", value: "increase" },
      ];

  const preview =
    account && signedAmountCents !== null
      ? `${account.name} ${account.isLiability ? "amount owed " : ""}will ${
          direction === "increase" ? "increase" : "decrease"
        } by ${currencyFormatter.format(Math.abs(signedAmountCents) / 100)}.`
      : null;

  return (
    <div className={styles.field}>
      <fieldset className={styles.fieldset} disabled={disabled || !account}>
        <legend className={styles.legend}>Direction</legend>
        <div className={styles.directionOptions}>
          {directionOptions.map((option) => (
            <label
              className={styles.directionOption}
              data-selected={direction === option.value}
              key={option.value}
            >
              <input
                className={styles.directionInput}
                type="radio"
                name={directionName}
                value={option.value}
                checked={direction === option.value}
                onChange={() => onDirectionChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <InputField
        disabled={disabled || !account}
        fieldClassName={styles.amountField}
        helperText="Enter a positive amount with up to two decimal places."
        inputMode="decimal"
        label="Amount"
        prefix="$"
        required
        value={amount}
        onChange={(event) => onAmountChange(event.target.value)}
      />

      {preview ? (
        <p className={styles.preview} aria-live="polite">
          {preview}
        </p>
      ) : null}
    </div>
  );
}
