"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/button/Button";
import modalStyles from "@/features/accounts/components/AccountCreateControl.module.css";
import deleteStyles from "./TransactionDeleteModal.module.css";
import styles from "./TransactionEditControl.module.css";

type TransferActionControlProps = {
  transfer: {
    id: number;
    name: string;
  };
};

function getErrorMessage(value: unknown) {
  if (value && typeof value === "object" && "detail" in value) {
    const detail = value.detail;

    if (typeof detail === "string") {
      return detail;
    }
  }

  return "Unable to delete the transfer.";
}

export function TransferActionControl({ transfer }: TransferActionControlProps) {
  const router = useRouter();
  const menuId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const confirmButtonId = useId();
  const controlRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeModal = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    setDeleteModalOpen(false);
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
    if (!deleteModalOpen) {
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
  }, [closeModal, confirmButtonId, deleteModalOpen]);

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

        setErrorMessage(getErrorMessage(responseData));
        return;
      }

      setDeleteModalOpen(false);
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
            className={[styles.actionsMenuItem, styles.actionsMenuItemDanger].join(
              " ",
            )}
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setDeleteModalOpen(true);
            }}
          >
            Delete Transfer
          </button>
        </div>
      ) : null}

      {deleteModalOpen ? (
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
