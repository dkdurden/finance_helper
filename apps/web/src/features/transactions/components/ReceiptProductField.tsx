"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/button/Button";
import { InputField } from "@/components/input/InputField";
import { SelectField, type SelectOption } from "@/components/input/SelectField";
import styles from "./TransactionCategoryField.module.css";

const createProductValue = "__create_product__";

export type ReceiptProduct = {
  defaultUnit: string | null;
  id: number;
  name: string;
};

type Props = {
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
  onProductCreated: (product: ReceiptProduct) => void;
  onValueChange: (product: ReceiptProduct) => void;
  products: ReceiptProduct[];
  value: number | null;
};

function getErrorMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = getErrorMessage(item);
      if (message !== "Unable to create the product.") return message;
    }
  }
  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      const message = getErrorMessage(field);
      if (message !== "Unable to create the product.") return message;
    }
  }
  return "Unable to create the product.";
}

export function ReceiptProductField({
  disabled = false,
  onPendingChange,
  onProductCreated,
  onValueChange,
  products,
  value,
}: Props) {
  const [createOpen, setCreateOpen] = useState(products.length === 0);
  const [name, setName] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const options = useMemo<SelectOption[]>(
    () => [
      ...products.map((product) => ({
        color: "var(--color-cyan)",
        label: product.name,
        value: String(product.id),
      })),
      { color: "var(--color-green)", label: "+ Create product", value: createProductValue },
    ],
    [products],
  );

  async function createProduct() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Enter a product name.");
      return;
    }
    setErrorMessage(null);
    setIsCreating(true);
    onPendingChange?.(true);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { method: "GET", cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Unable to initialize product security.");
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          default_unit: defaultUnit.trim() || null,
          is_archived: false,
        }),
      });
      let data: unknown = null;
      try { data = await response.json(); } catch { data = null; }
      if (!response.ok) {
        setErrorMessage(getErrorMessage(data));
        return;
      }
      if (!data || typeof data !== "object" || !("id" in data) || typeof data.id !== "number" || !("name" in data) || typeof data.name !== "string") {
        throw new Error("The product service returned an unexpected response.");
      }
      const product: ReceiptProduct = {
        id: data.id,
        name: data.name,
        defaultUnit: "default_unit" in data && typeof data.default_unit === "string" ? data.default_unit : null,
      };
      onProductCreated(product);
      onValueChange(product);
      setName("");
      setDefaultUnit("");
      setCreateOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create the product.");
    } finally {
      setIsCreating(false);
      onPendingChange?.(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!isCreating) void createProduct();
    }
  }

  return (
    <div className={styles.field}>
      <SelectField
        disabled={disabled || isCreating}
        helperText=""
        label="Product"
        noneLabel={products.length === 0 ? "Create a product first" : "Select a product"}
        options={options}
        required
        value={value === null ? "" : String(value)}
        onChange={(event) => {
          if (event.target.value === createProductValue) {
            setCreateOpen(true);
            setErrorMessage(null);
            return;
          }
          const product = products.find((option) => option.id === Number(event.target.value));
          if (product) onValueChange(product);
        }}
      />
      {createOpen ? (
        <div className={styles.createPanel}>
          <InputField autoFocus disabled={disabled || isCreating} fieldClassName={styles.inputField} helperText="" label="New Product Name" maxLength={255} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={handleKeyDown} />
          <InputField disabled={disabled || isCreating} fieldClassName={styles.inputField} helperText="Optional, for example each, lb, or kg." label="Default Unit" maxLength={50} value={defaultUnit} onChange={(event) => setDefaultUnit(event.target.value)} onKeyDown={handleKeyDown} />
          {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}
          <div className={styles.actions}>
            <Button className={styles.createButton} disabled={disabled || isCreating} onClick={() => void createProduct()}>
              {isCreating ? "Creating..." : "Create Product"}
            </Button>
            {products.length > 0 ? (
              <Button disabled={disabled || isCreating} variant="tertiary" onClick={() => { setCreateOpen(false); setErrorMessage(null); }}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
