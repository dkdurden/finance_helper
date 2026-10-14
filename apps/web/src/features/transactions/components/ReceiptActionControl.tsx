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
import type { TransactionAccountOption } from "./TransactionCreateControl";
import type { TransactionCategory } from "./TransactionCategoryField";
import formStyles from "./TransactionCreateControl.module.css";
import deleteStyles from "./TransactionDeleteModal.module.css";
import actionStyles from "./TransactionEditControl.module.css";
import styles from "./ReceiptActionControl.module.css";

type ReceiptItemDetails = {
  id: number;
  line_total_cents: number;
  product: number;
  product_is_archived: boolean;
  product_name: string;
  qty: string | null;
  unit: string | null;
  unit_price_cents: number | null;
};

type ReceiptDetails = {
  account: number;
  account_name: string;
  category: number;
  category_name: string;
  date: string;
  fees_cents: number;
  id: number;
  items: ReceiptItemDetails[];
  note: string | null;
  store: string | null;
  tax_cents: number;
};

type ReceiptActionControlProps = {
  accounts: TransactionAccountOption[];
  categories: TransactionCategory[];
  optionsError?: string | null;
  products: Array<{ defaultUnit: string | null; id: number; name: string }>;
  receipt: { id: number; name: string };
};

function getErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = getErrorMessage(item, fallback);
      if (message !== fallback) return message;
    }
  }
  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      const message = getErrorMessage(field, fallback);
      if (message !== fallback) return message;
    }
  }
  return fallback;
}

function isReceiptDetails(value: unknown): value is ReceiptDetails {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ReceiptDetails>;
  return (
    typeof data.id === "number" &&
    typeof data.account === "number" &&
    typeof data.account_name === "string" &&
    typeof data.category === "number" &&
    typeof data.category_name === "string" &&
    typeof data.date === "string" &&
    typeof data.tax_cents === "number" &&
    typeof data.fees_cents === "number" &&
    Array.isArray(data.items) &&
    data.items.length > 0
  );
}

function formatCents(cents: number | null) {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

function parseCents(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

export function ReceiptActionControl({
  accounts,
  categories,
  optionsError = null,
  products,
  receipt,
}: ReceiptActionControlProps) {
  const router = useRouter();
  const menuId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const controlRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const nextTemporaryItemId = useRef(-1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"delete" | "edit" | null>(null);
  const [details, setDetails] = useState<ReceiptDetails | null>(null);
  const [tax, setTax] = useState("");
  const [fees, setFees] = useState("");
  const [itemAmounts, setItemAmounts] = useState<
    Record<number, { line: string; unitPrice: string }>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
  const categoryOptions = useMemo<SelectOption[]>(() => {
    const options = categories.map((category) => ({
      color: "var(--color-green)",
      label: category.name,
      value: String(category.id),
    }));
    if (details && !categories.some((category) => category.id === details.category)) {
      options.push({
        color: "var(--color-grey-300)",
        label: details.category_name,
        value: String(details.category),
      });
    }
    return options;
  }, [categories, details]);

  function getProductOptions(item: ReceiptItemDetails): SelectOption[] {
    const options = products.map((product) => ({
      color: "var(--color-cyan)",
      label: product.name,
      value: String(product.id),
    }));
    if (!products.some((product) => product.id === item.product)) {
      options.push({
        color: "var(--color-grey-300)",
        label: item.product_name,
        value: String(item.product),
      });
    }
    return options;
  }

  function addItem() {
    if (!details || products.length === 0) return;
    const product = products[0];
    const id = nextTemporaryItemId.current--;
    setDetails({
      ...details,
      items: [
        ...details.items,
        {
          id,
          line_total_cents: 0,
          product: product.id,
          product_is_archived: false,
          product_name: product.name,
          qty: null,
          unit: product.defaultUnit,
          unit_price_cents: null,
        },
      ],
    });
    setItemAmounts({
      ...itemAmounts,
      [id]: { line: "0.00", unitPrice: "" },
    });
  }

  function removeItem(itemId: number) {
    if (!details || details.items.length === 1) return;
    setDetails({
      ...details,
      items: details.items.filter((item) => item.id !== itemId),
    });
    setItemAmounts((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  }

  const closeModal = useCallback(() => {
    if (!isLoading && !isSubmitting) {
      setActiveModal(null);
      setDetails(null);
      setErrorMessage(null);
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, [isLoading, isSubmitting]);

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
    if (activeModal !== "edit") return;
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(null);
    void fetch(`/api/receipts/${receipt.id}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(getErrorMessage(data, "Unable to load the receipt."));
        }
        if (!isReceiptDetails(data)) {
          throw new Error("The receipt service returned an unexpected response.");
        }
        setDetails(data);
        setTax(formatCents(data.tax_cents));
        setFees(formatCents(data.fees_cents));
        setItemAmounts(
          Object.fromEntries(
            data.items.map((item) => [
              item.id,
              {
                line: formatCents(item.line_total_cents),
                unitPrice: formatCents(item.unit_price_cents),
              },
            ]),
          ),
        );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load the receipt.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [activeModal, receipt.id]);

  useEffect(() => {
    if (!activeModal) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeModal, closeModal]);

  async function initializeCsrf() {
    const response = await fetch("/api/auth/csrf", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Unable to initialize receipt security.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details) return;
    setErrorMessage(null);
    const taxCents = parseCents(tax);
    const feesCents = parseCents(fees);
    const items = details.items.map((item) => {
      const amounts = itemAmounts[item.id];
      return {
        ...(item.id > 0 ? { id: item.id } : {}),
        product: item.product,
        qty: item.qty?.trim() || null,
        unit: item.unit?.trim() || null,
        unit_price_cents: amounts?.unitPrice.trim()
          ? parseCents(amounts.unitPrice)
          : null,
        line_total_cents: amounts ? parseCents(amounts.line) : null,
      };
    });
    const invalidAmount = details.items.some(
      (item) => {
        const amounts = itemAmounts[item.id];
        return (
          !amounts ||
          parseCents(amounts.line) === null ||
          (amounts.unitPrice.trim() !== "" &&
            parseCents(amounts.unitPrice) === null)
        );
      },
    );
    if (taxCents === null || feesCents === null || invalidAmount) {
      setErrorMessage(
        "Enter valid non-negative dollar amounts with up to two decimal places.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await initializeCsrf();
      const response = await fetch(`/api/receipts/${receipt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: details.account,
          category: details.category,
          date: details.date,
          store: details.store?.trim() || null,
          note: details.note?.trim() || null,
          tax_cents: taxCents,
          fees_cents: feesCents,
          items,
        }),
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (!response.ok) {
        setErrorMessage(getErrorMessage(data, "Unable to update the receipt."));
        return;
      }
      setActiveModal(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update the receipt.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await initializeCsrf();
      const response = await fetch(`/api/receipts/${receipt.id}`, {
        method: "DELETE",
      });
      let data: unknown = null;
      if (!response.ok) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
        setErrorMessage(getErrorMessage(data, "Unable to delete the receipt."));
        return;
      }
      setActiveModal(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete the receipt.",
      );
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
        aria-label={`Open ${receipt.name} receipt actions`}
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
            onClick={() => {
              setMenuOpen(false);
              setActiveModal("edit");
            }}
          >
            Edit Receipt
          </button>
          <button
            className={[
              actionStyles.actionsMenuItem,
              actionStyles.actionsMenuItemDanger,
            ].join(" ")}
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setErrorMessage(null);
              setActiveModal("delete");
            }}
          >
            Delete Receipt
          </button>
        </div>
      ) : null}

      {activeModal ? (
        <div
          className={modalStyles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className={[modalStyles.modal, styles.modal].join(" ")}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            <header className={modalStyles.header}>
              <h2 className={modalStyles.title} id={titleId}>
                {activeModal === "edit"
                  ? "Edit Receipt"
                  : `Delete “${receipt.name}” receipt?`}
              </h2>
              <button
                className={modalStyles.closeButton}
                type="button"
                aria-label={`Close ${activeModal === "edit" ? "Edit" : "Delete"} Receipt modal`}
                disabled={isLoading || isSubmitting}
                onClick={closeModal}
              >
                <Image src="/images/icon-close-modal.svg" alt="" width={32} height={32} aria-hidden="true" />
              </button>
            </header>

            {activeModal === "edit" ? (
              <form className={formStyles.content} onSubmit={handleSubmit}>
                <p className={modalStyles.description} id={descriptionId}>
                  Update the receipt and its existing item details. Products and
                  item membership stay unchanged.
                </p>
                {isLoading ? (
                  <p className={formStyles.statusMessage}>Loading receipt...</p>
                ) : null}
                {details ? (
                  <div className={formStyles.controls}>
                    <InputField label="Date" type="date" required disabled={isSubmitting} value={details.date} onChange={(event) => setDetails({ ...details, date: event.target.value })} />
                    <InputField label="Store" maxLength={255} disabled={isSubmitting} value={details.store ?? ""} onChange={(event) => setDetails({ ...details, store: event.target.value })} />
                    <InputField label="Note" disabled={isSubmitting} value={details.note ?? ""} onChange={(event) => setDetails({ ...details, note: event.target.value })} />
                    <SelectField label="Account" required disabled={isSubmitting} options={accountOptions} value={String(details.account)} onChange={(event) => setDetails({ ...details, account: Number(event.target.value) })} />
                    <SelectField label="Category" required disabled={isSubmitting} options={categoryOptions} value={String(details.category)} onChange={(event) => setDetails({ ...details, category: Number(event.target.value) })} />
                    <div className={styles.moneyGrid}>
                      <InputField label="Tax" prefix="$" inputMode="decimal" required disabled={isSubmitting} value={tax} onChange={(event) => setTax(event.target.value)} />
                      <InputField label="Fees" prefix="$" inputMode="decimal" required disabled={isSubmitting} value={fees} onChange={(event) => setFees(event.target.value)} />
                    </div>
                    <div className={styles.items}>
                      {details.items.map((item, index) => (
                        <fieldset className={styles.item} key={item.id} disabled={isSubmitting}>
                          <legend className={styles.itemTitle}>Item {index + 1}</legend>
                          <div className={styles.itemGrid}>
                            <SelectField
                              className={styles.productField}
                              label="Product"
                              required
                              options={getProductOptions(item)}
                              value={String(item.product)}
                              onChange={(event) => {
                                const product = products.find(
                                  (option) => option.id === Number(event.target.value),
                                );
                                if (!product) return;
                                setDetails({
                                  ...details,
                                  items: details.items.map((current, currentIndex) =>
                                    currentIndex === index
                                      ? {
                                          ...current,
                                          product: product.id,
                                          product_is_archived: false,
                                          product_name: product.name,
                                          unit: product.defaultUnit,
                                        }
                                      : current,
                                  ),
                                });
                              }}
                            />
                            <InputField label="Quantity" inputMode="decimal" value={item.qty ?? ""} onChange={(event) => setDetails({ ...details, items: details.items.map((current, currentIndex) => currentIndex === index ? { ...current, qty: event.target.value } : current) })} />
                            <InputField label="Unit" maxLength={50} value={item.unit ?? ""} onChange={(event) => setDetails({ ...details, items: details.items.map((current, currentIndex) => currentIndex === index ? { ...current, unit: event.target.value } : current) })} />
                            <InputField label="Unit price" prefix="$" inputMode="decimal" value={itemAmounts[item.id]?.unitPrice ?? ""} onChange={(event) => setItemAmounts({ ...itemAmounts, [item.id]: { ...itemAmounts[item.id], unitPrice: event.target.value } })} />
                            <InputField label="Line total" prefix="$" inputMode="decimal" required value={itemAmounts[item.id]?.line ?? ""} onChange={(event) => setItemAmounts({ ...itemAmounts, [item.id]: { ...itemAmounts[item.id], line: event.target.value } })} />
                          </div>
                          <Button
                            className={styles.removeItemButton}
                            type="button"
                            variant="tertiary"
                            disabled={details.items.length === 1}
                            onClick={() => removeItem(item.id)}
                          >
                            Remove Item
                          </Button>
                        </fieldset>
                      ))}
                      <Button
                        type="button"
                        variant="tertiary"
                        disabled={isSubmitting || products.length === 0}
                        onClick={addItem}
                      >
                        + Add Item
                      </Button>
                    </div>
                  </div>
                ) : null}
                {optionsError ? (
                  <p className={`${formStyles.statusMessage} ${formStyles.errorMessage}`} role="alert">{optionsError}</p>
                ) : null}
                {errorMessage ? (
                  <p className={`${formStyles.statusMessage} ${formStyles.errorMessage}`} role="alert">{errorMessage}</p>
                ) : null}
                {details ? (
                  <Button type="submit" disabled={isSubmitting || optionsError !== null}>
                    {isSubmitting ? "Saving Changes..." : "Save Changes"}
                  </Button>
                ) : null}
              </form>
            ) : (
              <>
                <p className={modalStyles.description} id={descriptionId}>
                  This deletes the receipt, its items, and its linked transaction.
                  This action cannot be reversed.
                </p>
                {errorMessage ? (
                  <p className={deleteStyles.errorMessage} role="alert">{errorMessage}</p>
                ) : null}
                <div className={deleteStyles.actions}>
                  <Button className={deleteStyles.confirmButton} variant="destroy" disabled={isSubmitting} onClick={handleDelete}>
                    {isSubmitting ? "Deleting Receipt..." : "Yes, Delete Receipt"}
                  </Button>
                  <Button className={deleteStyles.cancelButton} variant="tertiary" disabled={isSubmitting} onClick={closeModal}>No, Go Back</Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
