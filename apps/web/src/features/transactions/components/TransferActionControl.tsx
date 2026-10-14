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
import { getSignedAmountCents } from "./TransactionAmountField";
import type { TransactionAccountOption } from "./TransactionCreateControl";
import formStyles from "./TransactionCreateControl.module.css";
import deleteStyles from "./TransactionDeleteModal.module.css";
import styles from "./TransactionEditControl.module.css";

type TransferActionControlProps = {
  accountError?: string | null;
  accounts: TransactionAccountOption[];
  transfer: {
    amountCents: number;
    date: string;
    fromAccountId: number;
    id: number;
    name: string;
    note: string | null;
    toAccountId: number;
  };
};

function getErrorMessage(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "detail" in value) {
    const detail = value.detail;

    if (typeof detail === "string") {
      return detail;
    }
  }

  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      if (Array.isArray(field)) {
        const message = field.find((item) => typeof item === "string");

        if (typeof message === "string") {
          return message;
        }
      }
    }
  }

  return fallback;
}

type TransferEditModalProps = TransferActionControlProps & {
  onClose: () => void;
};

function TransferEditModal({
  accountError = null,
  accounts,
  onClose,
  transfer,
}: TransferEditModalProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const fromAccountSelectId = useId();
  const [fromAccountId, setFromAccountId] = useState<number | null>(
    transfer.fromAccountId,
  );
  const [toAccountId, setToAccountId] = useState<number | null>(
    transfer.toAccountId,
  );
  const [amount, setAmount] = useState(() =>
    (transfer.amountCents / 100).toFixed(2),
  );
  const [date, setDate] = useState(transfer.date);
  const [note, setNote] = useState(transfer.note ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  useEffect(() => {
    document.getElementById(fromAccountSelectId)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeModal, fromAccountSelectId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const amountCents = getSignedAmountCents(amount, "increase");

    if (fromAccountId === null) {
      setErrorMessage("Select a source account.");
      return;
    }

    if (toAccountId === null) {
      setErrorMessage("Select a destination account.");
      return;
    }

    if (fromAccountId === toAccountId) {
      setErrorMessage("Choose two different accounts for the transfer.");
      return;
    }

    if (amountCents === null) {
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
        throw new Error("Unable to initialize transfer security.");
      }

      const response = await fetch(`/api/transfers/${transfer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_cents: amountCents,
          date,
          from_account: fromAccountId,
          note: note.trim() || null,
          to_account: toAccountId,
        }),
      });

      let responseData: unknown = null;

      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        setErrorMessage(
          getErrorMessage(responseData, "Unable to update the transfer."),
        );
        return;
      }

      onClose();
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update the transfer.",
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
            Edit Transfer
          </h2>
          <button
            className={modalStyles.closeButton}
            type="button"
            aria-label="Close Edit Transfer modal"
            disabled={isSubmitting}
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
            Update the date, note, source, destination, and amount.
          </p>

          <div className={formStyles.controls}>
            <InputField
              disabled={isSubmitting}
              helperText=""
              label="Date"
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />

            <InputField
              disabled={isSubmitting}
              helperText="Optional. Searchable from the transaction list."
              label="Note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />

            <SelectField
              disabled={isSubmitting || accounts.length < 2}
              helperText=""
              id={fromAccountSelectId}
              label="From account"
              noneLabel="Select an account"
              options={accountOptions}
              placeholder="Select an account"
              required
              value={fromAccountId === null ? "" : String(fromAccountId)}
              onChange={(event) => {
                const nextAccountId = Number(event.target.value);
                setFromAccountId(
                  accounts.some((account) => account.id === nextAccountId)
                    ? nextAccountId
                    : null,
                );

                if (nextAccountId === toAccountId) {
                  setToAccountId(null);
                }
              }}
            />

            <SelectField
              disabled={isSubmitting || accounts.length < 2}
              helperText=""
              label="To account"
              noneLabel="Select an account"
              options={accountOptions.filter(
                (account) => account.value !== String(fromAccountId),
              )}
              placeholder="Select an account"
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
          </div>

          {accountError ? (
            <p
              className={`${formStyles.statusMessage} ${formStyles.errorMessage}`}
              role="alert"
            >
              {accountError}
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
            disabled={isSubmitting || accounts.length < 2 || accountError !== null}
          >
            {isSubmitting ? "Saving Changes..." : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function TransferActionControl({
  accountError = null,
  accounts,
  transfer,
}: TransferActionControlProps) {
  const router = useRouter();
  const menuId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const confirmButtonId = useId();
  const controlRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"delete" | "edit" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeModal = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    setActiveModal(null);
    setErrorMessage(null);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, [isSubmitting]);

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

  useEffect(() => {
    if (activeModal !== "delete") {
      return;
    }

    document.getElementById(confirmButtonId)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeModal, closeModal, confirmButtonId]);

  async function handleDelete() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        method: "GET",
        cache: "no-store",
      });

      if (!csrfResponse.ok) {
        throw new Error("Unable to initialize transfer security.");
      }

      const response = await fetch(`/api/transfers/${transfer.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let responseData: unknown = null;

        try {
          responseData = await response.json();
        } catch {
          responseData = null;
        }

        setErrorMessage(
          getErrorMessage(responseData, "Unable to delete the transfer."),
        );
        return;
      }

      setActiveModal(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete the transfer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.actions} ref={controlRef}>
      <button
        ref={menuButtonRef}
        className={styles.moreButton}
        type="button"
        aria-controls={menuId}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Open ${transfer.name} transfer actions`}
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
              setActiveModal("edit");
            }}
          >
            Edit Transfer
          </button>
          <button
            className={[styles.actionsMenuItem, styles.actionsMenuItemDanger].join(
              " ",
            )}
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setActiveModal("delete");
            }}
          >
            Delete Transfer
          </button>
        </div>
      ) : null}

      {activeModal === "edit" ? (
        <TransferEditModal
          accountError={accountError}
          accounts={accounts}
          transfer={transfer}
          onClose={closeModal}
        />
      ) : null}

      {activeModal === "delete" ? (
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
                Delete “{transfer.name}”?
              </h2>
              <button
                className={modalStyles.closeButton}
                type="button"
                aria-label="Close Delete Transfer modal"
                disabled={isSubmitting}
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

            <p className={modalStyles.description} id={descriptionId}>
              This removes the transfer and both account postings. This action
              cannot be reversed.
            </p>

            {errorMessage ? (
              <p className={deleteStyles.errorMessage} role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className={deleteStyles.actions}>
              <Button
                id={confirmButtonId}
                className={deleteStyles.confirmButton}
                variant="destroy"
                disabled={isSubmitting}
                onClick={handleDelete}
              >
                {isSubmitting ? "Deleting Transfer..." : "Yes, Delete Transfer"}
              </Button>
              <Button
                className={deleteStyles.cancelButton}
                variant="tertiary"
                disabled={isSubmitting}
                onClick={closeModal}
              >
                No, Go Back
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
