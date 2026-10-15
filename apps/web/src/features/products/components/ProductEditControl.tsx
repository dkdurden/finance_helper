"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/button/Button";
import { InputField } from "@/components/input/InputField";
import modalStyles from "@/features/accounts/components/AccountCreateControl.module.css";
import actionStyles from "@/features/accounts/components/AccountEditControl.module.css";

type ProductEditControlProps = {
  product: {
    defaultUnit: string | null;
    id: number;
    isArchived: boolean;
    name: string;
  };
};

function getErrorMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = getErrorMessage(item);
      if (message !== "Unable to update the product.") return message;
    }
  }
  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      const message = getErrorMessage(field);
      if (message !== "Unable to update the product.") return message;
    }
  }
  return "Unable to update the product.";
}

export function ProductEditControl({ product }: ProductEditControlProps) {
  const router = useRouter();
  const menuId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const nameId = useId();
  const controlRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<"archive" | "restore" | null>(null);
  const [name, setName] = useState(product.name);
  const [defaultUnit, setDefaultUnit] = useState(product.defaultUnit ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setModalOpen(false);
    setName(product.name);
    setDefaultUnit(product.defaultUnit ?? "");
    setErrorMessage(null);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, [isSubmitting, product.defaultUnit, product.name]);

  const closeStatusModal = useCallback(() => {
    if (isSubmitting) return;
    setStatusAction(null);
    setErrorMessage(null);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, [isSubmitting]);

  useEffect(() => {
    if (!menuOpen) return;
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
    if (!modalOpen) return;
    document.getElementById(nameId)?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeModal, modalOpen, nameId]);

  useEffect(() => {
    if (!statusAction) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeStatusModal();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeStatusModal, statusAction]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    setErrorMessage(null);
    if (!trimmedName) {
      setErrorMessage("Enter a product name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { method: "GET", cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Unable to initialize product security.");
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          default_unit: defaultUnit.trim() || null,
        }),
      });
      let data: unknown = null;
      try { data = await response.json(); } catch { data = null; }
      if (!response.ok) {
        setErrorMessage(getErrorMessage(data));
        return;
      }
      setModalOpen(false);
      router.refresh();
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update the product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateArchivedStatus() {
    if (!statusAction) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { method: "GET", cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Unable to initialize product security.");
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: statusAction === "archive" }),
      });
      let data: unknown = null;
      try { data = await response.json(); } catch { data = null; }
      if (!response.ok) {
        setErrorMessage(getErrorMessage(data));
        return;
      }
      setStatusAction(null);
      router.refresh();
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update the product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={actionStyles.actions} ref={controlRef}>
      <button
        ref={menuButtonRef}
        className={actionStyles.moreButton}
        type="button"
        aria-controls={menuId}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Open ${product.name} product actions`}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <Image src="/images/icon-ellipsis.svg" alt="" width={16} height={16} aria-hidden="true" />
      </button>
      {menuOpen ? (
        <div className={actionStyles.actionsMenu} id={menuId} role="menu">
          <button
            className={actionStyles.actionsMenuItem}
            type="button"
            role="menuitem"
            onClick={() => { setMenuOpen(false); setModalOpen(true); }}
          >
            Edit Product
          </button>
          <button
            className={[
              actionStyles.actionsMenuItem,
              !product.isArchived ? actionStyles.actionsMenuItemDanger : "",
            ].filter(Boolean).join(" ")}
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setStatusAction(product.isArchived ? "restore" : "archive");
            }}
          >
            {product.isArchived ? "Restore Product" : "Archive Product"}
          </button>
        </div>
      ) : null}

      {modalOpen ? (
        <div className={modalStyles.overlay} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}>
          <div className={modalStyles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
            <header className={modalStyles.header}>
              <h2 className={modalStyles.title} id={titleId}>Edit Product</h2>
              <button className={modalStyles.closeButton} type="button" aria-label="Close Edit Product modal" disabled={isSubmitting} onClick={closeModal}>
                <Image src="/images/icon-close-modal.svg" alt="" width={32} height={32} aria-hidden="true" />
              </button>
            </header>
            <form className={modalStyles.form} onSubmit={handleSubmit}>
              <p className={modalStyles.description} id={descriptionId}>Update the product name and its default receipt unit.</p>
              <InputField fieldClassName={modalStyles.inputField} helperText="" id={nameId} label="Product Name" maxLength={255} required value={name} onChange={(event) => setName(event.target.value)} />
              <InputField fieldClassName={modalStyles.inputField} helperText="Optional, for example each, lb, or kg." label="Default Unit" maxLength={50} value={defaultUnit} onChange={(event) => setDefaultUnit(event.target.value)} />
              {errorMessage ? <p className={modalStyles.errorMessage} role="alert">{errorMessage}</p> : null}
              <Button className={modalStyles.submitButton} type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving Changes..." : "Save Changes"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      {statusAction ? (
        <div className={modalStyles.overlay} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeStatusModal();
        }}>
          <div className={modalStyles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
            <header className={modalStyles.header}>
              <h2 className={modalStyles.title} id={titleId}>
                {statusAction === "archive" ? "Archive Product" : "Restore Product"}
              </h2>
              <button className={modalStyles.closeButton} type="button" aria-label={`Close ${statusAction === "archive" ? "Archive" : "Restore"} Product modal`} disabled={isSubmitting} onClick={closeStatusModal}>
                <Image src="/images/icon-close-modal.svg" alt="" width={32} height={32} aria-hidden="true" />
              </button>
            </header>
            <div className={modalStyles.form}>
              <p className={modalStyles.description} id={descriptionId}>
                {statusAction === "archive"
                  ? `Archive “${product.name}”? Existing receipts will keep their history, but the product will no longer be available for new receipt items.`
                  : `Restore “${product.name}”? It will become available for new receipt items again.`}
              </p>
              {errorMessage ? <p className={modalStyles.errorMessage} role="alert">{errorMessage}</p> : null}
              <Button
                className={modalStyles.submitButton}
                variant={statusAction === "archive" ? "destroy" : "primary"}
                disabled={isSubmitting}
                onClick={() => void updateArchivedStatus()}
              >
                {isSubmitting
                  ? statusAction === "archive" ? "Archiving..." : "Restoring..."
                  : statusAction === "archive" ? "Archive Product" : "Restore Product"}
              </Button>
              <Button variant="tertiary" disabled={isSubmitting} onClick={closeStatusModal}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
