"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/button/Button";
import type { EditableAccount } from "./AccountModal";
import modalStyles from "./AccountCreateControl.module.css";
import styles from "./AccountDeleteModal.module.css";

type AccountDeleteModalProps = {
  account: EditableAccount;
  onClose: () => void;
};

function getErrorMessage(value: unknown) {
  if (value && typeof value === "object" && "detail" in value) {
    const detail = value.detail;

    if (typeof detail === "string") {
      return detail;
    }
  }

  return "Unable to delete the account.";
}

export function AccountDeleteModal({ account, onClose }: AccountDeleteModalProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const confirmButtonId = useId();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.getElementById(confirmButtonId)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmButtonId, isSubmitting, onClose]);

  async function handleDelete() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        method: "GET",
        cache: "no-store",
      });

      if (!csrfResponse.ok) {
        throw new Error("Unable to initialize account security.");
      }

      const response = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let responseData: unknown = null;

        try {
          responseData = await response.json();
        } catch {
          responseData = null;
        }

        setErrorMessage(getErrorMessage(responseData));
        return;
      }

      onClose();
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete the account.",
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
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
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
            Delete “{account.name}”?
          </h2>
          <button
            className={modalStyles.closeButton}
            type="button"
            aria-label="Close Delete Account modal"
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

        <p className={modalStyles.description} id={descriptionId}>
          Are you sure you want to delete this account? This action cannot be
          reversed. Accounts with transactions or transfers cannot be deleted.
        </p>

        {errorMessage ? (
          <p className={styles.errorMessage} role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button
            id={confirmButtonId}
            className={styles.confirmButton}
            variant="destroy"
            disabled={isSubmitting}
            onClick={handleDelete}
          >
            {isSubmitting ? "Deleting Account..." : "Yes, Delete Account"}
          </Button>
          <Button
            className={styles.cancelButton}
            variant="tertiary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            No, Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
