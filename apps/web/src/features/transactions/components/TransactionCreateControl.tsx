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
import {
  TransactionAmountField,
  getSignedAmountCents,
  type TransactionDirection,
} from "./TransactionAmountField";
import {
  TransactionCategoryField,
  type TransactionCategory,
} from "./TransactionCategoryField";
import {
  ReceiptProductField,
  type ReceiptProduct,
} from "./ReceiptProductField";
import styles from "./TransactionCreateControl.module.css";

export type TransactionAccountOption = {
  id: number;
  isLiability: boolean;
  name: string;
};

type TransactionCreateControlProps = {
  accountError?: string | null;
  accounts: TransactionAccountOption[];
  categories: TransactionCategory[];
  categoryError?: string | null;
  productError?: string | null;
  products: Array<{ defaultUnit: string | null; id: number; name: string }>;
};

type EntryType = "transaction" | "transfer" | "receipt";

type ReceiptItemDraft = {
  id: number;
  lineTotal: string;
  productId: number;
  qty: string;
  unit: string;
  unitPrice: string;
};

function getErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const message = value.find((item) => typeof item === "string");
    return typeof message === "string" ? message : fallback;
  }

  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      const message = getErrorMessage(field, fallback);

      if (message !== fallback) {
        return message;
      }
    }
  }

  return fallback;
}

function getLocalDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

function parseNonNegativeCents(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

export function TransactionCreateControl({
  accountError = null,
  accounts,
  categories: initialCategories,
  categoryError = null,
  productError = null,
  products: initialProducts,
}: TransactionCreateControlProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const accountSelectId = useId();
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>("transaction");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getLocalDate);
  const [direction, setDirection] = useState<TransactionDirection>("decrease");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [receiptTax, setReceiptTax] = useState("0.00");
  const [receiptFees, setReceiptFees] = useState("0.00");
  const nextReceiptItemId = useRef(1);
  const [receiptItems, setReceiptItems] = useState<ReceiptItemDraft[]>([]);
  const [categoryPending, setCategoryPending] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [products, setProducts] = useState(initialProducts);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const optionsError = accountError ??
    (entryType === "transaction" || entryType === "receipt" ? categoryError : null) ??
    (entryType === "receipt" ? productError : null);

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
  const entryTypeOptions = useMemo<SelectOption[]>(
    () => [
      {
        color: "var(--color-green)",
        label: "Transaction",
        value: "transaction",
      },
      {
        color: "var(--color-cyan)",
        label: "Transfer",
        value: "transfer",
      },
      {
        color: "var(--color-yellow)",
        label: "Receipt",
        value: "receipt",
      },
    ],
    [],
  );
  function createReceiptItem(
    selectedProduct?: ReceiptProduct,
  ): ReceiptItemDraft | null {
    const product = selectedProduct ?? products[0];
    if (!product) return null;
    return {
      id: nextReceiptItemId.current++,
      lineTotal: "",
      productId: product.id,
      qty: "",
      unit: product.defaultUnit ?? "",
      unitPrice: "",
    };
  }

  function updateReceiptItem(id: number, updates: Partial<ReceiptItemDraft>) {
    setReceiptItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }

  const closeModal = useCallback(() => {
    if (categoryPending || isSubmitting) {
      return;
    }

    setModalOpen(false);
    requestAnimationFrame(() => {
      triggerWrapRef.current?.querySelector("button")?.focus();
    });
  }, [categoryPending, isSubmitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const signedAmountCents = getSignedAmountCents(
      amount,
      entryType === "transfer" ? "increase" : direction,
    );

    if (accountId === null) {
      setErrorMessage(
        entryType === "transfer" ? "Select a source account." : "Select an account.",
      );
      return;
    }

    if (entryType !== "transfer" && categoryId === null) {
      setErrorMessage("Select a category.");
      return;
    }

    if (entryType === "transfer" && toAccountId === null) {
      setErrorMessage("Select a destination account.");
      return;
    }

    if (entryType === "transfer" && accountId === toAccountId) {
      setErrorMessage("Choose two different accounts for the transfer.");
      return;
    }

    if (entryType !== "receipt" && signedAmountCents === null) {
      setErrorMessage("Enter a valid amount greater than zero with up to two decimal places.");
      return;
    }

    if (!date) {
      setErrorMessage("Select a date.");
      return;
    }

    const taxCents = parseNonNegativeCents(receiptTax);
    const feesCents = parseNonNegativeCents(receiptFees);
    const invalidReceiptItemAmount = receiptItems.some(
      (item) =>
        parseNonNegativeCents(item.lineTotal) === null ||
        (item.unitPrice.trim() !== "" &&
          parseNonNegativeCents(item.unitPrice) === null),
    );
    const receiptItemPayload = receiptItems.map((item) => ({
      product: item.productId,
      qty: item.qty.trim() || null,
      unit: item.unit.trim() || null,
      unit_price_cents: item.unitPrice.trim()
        ? parseNonNegativeCents(item.unitPrice)
        : null,
      line_total_cents: parseNonNegativeCents(item.lineTotal),
    }));
    if (
      entryType === "receipt" &&
      (taxCents === null ||
        feesCents === null ||
        receiptItemPayload.length === 0 ||
        invalidReceiptItemAmount)
    ) {
      setErrorMessage("Enter valid non-negative dollar amounts with up to two decimal places.");
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

      const response = await fetch(
        entryType === "transfer"
          ? "/api/transfers"
          : entryType === "receipt"
            ? "/api/receipts"
            : "/api/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            entryType === "transfer"
              ? {
                  amount_cents: signedAmountCents,
                  date,
                  from_account: accountId,
                  note: note.trim() || null,
                  to_account: toAccountId,
                }
              : entryType === "receipt"
                ? {
                    account: accountId,
                    category: categoryId,
                    date,
                    store: merchant.trim() || null,
                    note: note.trim() || null,
                    tax_cents: taxCents,
                    fees_cents: feesCents,
                    items: receiptItemPayload,
                  }
                : {
                  account: accountId,
                  category: categoryId,
                  date,
                  merchant: merchant.trim() || null,
                  note: note.trim() || null,
                  signed_amount_cents: signedAmountCents,
                  transaction_type: "normal",
                  transfer: null,
                },
          ),
        },
      );

      let responseData: unknown = null;

      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        setErrorMessage(
          getErrorMessage(
            responseData,
            entryType === "transfer"
              ? "Unable to add the transfer."
              : entryType === "receipt"
                ? "Unable to add the receipt."
                : "Unable to add the transaction.",
          ),
        );
        return;
      }

      setModalOpen(false);
      setEntryType("transaction");
      setAccountId(null);
      setToAccountId(null);
      setCategoryId(null);
      setAmount("");
      setDate(getLocalDate());
      setDirection("decrease");
      setMerchant("");
      setNote("");
      setReceiptTax("0.00");
      setReceiptFees("0.00");
      setReceiptItems([]);
      router.refresh();
      requestAnimationFrame(() => {
        triggerWrapRef.current?.querySelector("button")?.focus();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : entryType === "transfer"
            ? "Unable to add the transfer."
            : entryType === "receipt"
              ? "Unable to add the receipt."
              : "Unable to add the transaction.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    document.getElementById(accountSelectId)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [accountSelectId, closeModal, modalOpen]);

  return (
    <div ref={triggerWrapRef}>
      <Button onClick={() => setModalOpen(true)}>+ Add Transaction</Button>

      {modalOpen ? (
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
                Add Transaction
              </h2>
              <button
                className={modalStyles.closeButton}
                type="button"
                aria-label="Close Add Transaction modal"
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

            <form className={styles.content} onSubmit={handleSubmit}>
              <p className={modalStyles.description} id={descriptionId}>
                {entryType === "transfer"
                  ? "Choose the source, destination, and amount for this transfer."
                  : entryType === "receipt"
                    ? "Enter the receipt details and at least one item."
                    : "Choose an account, category, and amount for this transaction."}
              </p>

              <div className={styles.controls}>
                <SelectField
                  helperText=""
                  label="Entry type"
                  options={entryTypeOptions}
                  value={entryType}
                  onChange={(event) => {
                    const nextEntryType = event.target.value as EntryType;
                    setEntryType(nextEntryType);
                    if (nextEntryType === "receipt" && receiptItems.length === 0) {
                      const item = createReceiptItem();
                      if (item) setReceiptItems([item]);
                    }
                    setErrorMessage(null);
                  }}
                />

                <InputField
                  disabled={categoryPending || isSubmitting}
                  helperText=""
                  label="Date"
                  required
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />

                <InputField
                  disabled={categoryPending || isSubmitting}
                  helperText="Optional. Searchable from the transaction list."
                  label="Note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />

                <SelectField
                  className={styles.accountField}
                  disabled={categoryPending || isSubmitting || accounts.length === 0}
                  helperText=""
                  id={accountSelectId}
                  label={entryType === "transfer" ? "From account" : "Account"}
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
                    if (entryType === "transfer" && nextAccount?.id === toAccountId) {
                      setToAccountId(null);
                    }
                    setDirection(nextAccount?.isLiability ? "increase" : "decrease");
                  }}
                />

                {entryType === "transfer" ? (
                  <>
                    <SelectField
                      disabled={isSubmitting || accounts.length < 2}
                      helperText=""
                      label="To account"
                      noneLabel={
                        accounts.length < 2
                          ? "Add another account first"
                          : "Select an account"
                      }
                      options={accountOptions.filter(
                        (account) => account.value !== String(accountId),
                      )}
                      placeholder={
                        accounts.length < 2
                          ? "Add another account first"
                          : "Select an account"
                      }
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
                  </>
                ) : (
                  <>
                    <InputField
                      disabled={categoryPending || isSubmitting}
                      helperText={
                        entryType === "receipt"
                          ? "Optional. Used as the receipt name in the ledger."
                          : "Optional. Used as the transaction name in the ledger."
                      }
                      label={entryType === "receipt" ? "Store" : "Merchant"}
                      maxLength={255}
                      value={merchant}
                      onChange={(event) => setMerchant(event.target.value)}
                    />

                    <TransactionCategoryField
                      categories={categories}
                      disabled={categoryPending || isSubmitting}
                      value={categoryId}
                      onCategoryCreated={(category) => {
                        setCategories((current) => [...current, category]);
                      }}
                      onPendingChange={setCategoryPending}
                      onValueChange={setCategoryId}
                    />

                    {entryType === "receipt" ? (
                      <>
                        <InputField
                          disabled={categoryPending || isSubmitting}
                          helperText="Enter zero or a positive amount with up to two decimal places."
                          inputMode="decimal"
                          label="Tax"
                          prefix="$"
                          value={receiptTax}
                          onChange={(event) => setReceiptTax(event.target.value)}
                        />
                        <InputField
                          disabled={categoryPending || isSubmitting}
                          helperText="Enter zero or a positive amount with up to two decimal places."
                          inputMode="decimal"
                          label="Fees"
                          prefix="$"
                          value={receiptFees}
                          onChange={(event) => setReceiptFees(event.target.value)}
                        />
                        <div className={styles.receiptItems}>
                          {receiptItems.length === 0 ? (
                            <ReceiptProductField
                              disabled={categoryPending || isSubmitting}
                              products={products}
                              value={null}
                              onPendingChange={setCategoryPending}
                              onProductCreated={(product) =>
                                setProducts((current) => [...current, product])
                              }
                              onValueChange={(product) => {
                                const item = createReceiptItem(product);
                                if (item) setReceiptItems([item]);
                              }}
                            />
                          ) : null}
                          {receiptItems.map((item, index) => (
                            <fieldset className={styles.receiptItem} key={item.id} disabled={isSubmitting}>
                              <legend className={styles.receiptItemTitle}>Item {index + 1}</legend>
                              <ReceiptProductField
                                disabled={categoryPending || isSubmitting}
                                products={products}
                                value={item.productId}
                                onPendingChange={setCategoryPending}
                                onProductCreated={(product) =>
                                  setProducts((current) => [...current, product])
                                }
                                onValueChange={(product) =>
                                  updateReceiptItem(item.id, {
                                    productId: product.id,
                                    unit: product.defaultUnit ?? "",
                                  })
                                }
                              />
                              <InputField label="Quantity" inputMode="decimal" value={item.qty} onChange={(event) => updateReceiptItem(item.id, { qty: event.target.value })} />
                              <InputField label="Unit" maxLength={50} value={item.unit} onChange={(event) => updateReceiptItem(item.id, { unit: event.target.value })} />
                              <InputField label="Unit price" prefix="$" inputMode="decimal" value={item.unitPrice} onChange={(event) => updateReceiptItem(item.id, { unitPrice: event.target.value })} />
                              <InputField label="Line total" prefix="$" inputMode="decimal" required value={item.lineTotal} onChange={(event) => updateReceiptItem(item.id, { lineTotal: event.target.value })} />
                              <Button type="button" variant="tertiary" disabled={receiptItems.length === 1} onClick={() => setReceiptItems((current) => current.filter((currentItem) => currentItem.id !== item.id))}>
                                Remove Item
                              </Button>
                            </fieldset>
                          ))}
                          <Button type="button" variant="tertiary" disabled={products.length === 0 || isSubmitting} onClick={() => {
                            const item = createReceiptItem();
                            if (item) setReceiptItems((current) => [...current, item]);
                          }}>
                            + Add Item
                          </Button>
                        </div>
                      </>
                    ) : (
                      <TransactionAmountField
                        account={selectedAccount}
                        amount={amount}
                        direction={direction}
                        disabled={categoryPending || isSubmitting}
                        onAmountChange={setAmount}
                        onDirectionChange={setDirection}
                      />
                    )}
                  </>
                )}
              </div>

              {optionsError ? (
                <p className={`${styles.statusMessage} ${styles.errorMessage}`} role="alert">
                  {optionsError}
                </p>
              ) : null}

              {errorMessage ? (
                <p className={`${styles.statusMessage} ${styles.errorMessage}`} role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={
                  categoryPending ||
                  isSubmitting ||
                  accounts.length < (entryType === "transfer" ? 2 : 1) ||
                  (entryType === "receipt" && (products.length === 0 || receiptItems.length === 0)) ||
                  optionsError !== null
                }
              >
                {isSubmitting
                  ? entryType === "transfer"
                    ? "Adding Transfer..."
                    : entryType === "receipt"
                      ? "Adding Receipt..."
                      : "Adding Transaction..."
                  : entryType === "transfer"
                    ? "Add Transfer"
                    : entryType === "receipt"
                      ? "Add Receipt"
                      : "Add Transaction"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
