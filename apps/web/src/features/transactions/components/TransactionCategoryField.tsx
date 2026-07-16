"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/button/Button";
import { InputField } from "@/components/input/InputField";
import { SelectField, type SelectOption } from "@/components/input/SelectField";
import styles from "./TransactionCategoryField.module.css";

const createCategoryValue = "__create_category__";

export type TransactionCategory = {
  id: number;
  name: string;
};

type TransactionCategoryFieldProps = {
  categories: TransactionCategory[];
  disabled?: boolean;
  onCategoryCreated?: (category: TransactionCategory) => void;
  onPendingChange?: (pending: boolean) => void;
  onValueChange: (categoryId: number | null) => void;
  value: number | null;
};

function getErrorMessage(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const message = value.find((item) => typeof item === "string");
    return typeof message === "string" ? message : "Unable to create the category.";
  }

  if (value && typeof value === "object") {
    for (const field of Object.values(value)) {
      const message = getErrorMessage(field);

      if (message !== "Unable to create the category.") {
        return message;
      }
    }
  }

  return "Unable to create the category.";
}

export function TransactionCategoryField({
  categories: initialCategories,
  disabled = false,
  onCategoryCreated,
  onPendingChange,
  onValueChange,
  value,
}: TransactionCategoryFieldProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const options = useMemo<SelectOption[]>(
    () => [
      ...categories.map((category) => ({
        color: "var(--color-green)",
        label: category.name,
        value: String(category.id),
      })),
      {
        color: "var(--color-green)",
        label: "+ Create category",
        value: createCategoryValue,
      },
    ],
    [categories],
  );

  async function createCategory() {
    const name = categoryDraft.trim();
    setErrorMessage(null);

    if (!name) {
      setErrorMessage("Enter a category name.");
      return;
    }

    setIsCreating(true);
    onPendingChange?.(true);

    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        method: "GET",
        cache: "no-store",
      });

      if (!csrfResponse.ok) {
        throw new Error("Unable to initialize category security.");
      }

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, is_archived: false }),
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

      if (
        !responseData ||
        typeof responseData !== "object" ||
        !("id" in responseData) ||
        typeof responseData.id !== "number" ||
        !("name" in responseData) ||
        typeof responseData.name !== "string"
      ) {
        throw new Error("The category service returned an unexpected response.");
      }

      const createdCategory = {
        id: responseData.id,
        name: responseData.name,
      };

      setCategories((current) => [...current, createdCategory]);
      onCategoryCreated?.(createdCategory);
      onValueChange(createdCategory.id);
      setCategoryDraft("");
      setCreateOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create the category.",
      );
    } finally {
      setIsCreating(false);
      onPendingChange?.(false);
    }
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (!isCreating) {
        void createCategory();
      }
    }
  }

  return (
    <div className={styles.field}>
      <SelectField
        disabled={disabled || isCreating}
        helperText=""
        label="Category"
        noneLabel="Select a category"
        options={options}
        placeholder="Select a category"
        required
        value={value === null ? "" : String(value)}
        onChange={(event) => {
          if (event.target.value === createCategoryValue) {
            setCreateOpen(true);
            setErrorMessage(null);
            return;
          }

          setCreateOpen(false);
          setErrorMessage(null);
          onValueChange(event.target.value ? Number(event.target.value) : null);
        }}
      />

      {createOpen ? (
        <div className={styles.createPanel}>
          <InputField
            autoFocus
            disabled={disabled || isCreating}
            fieldClassName={styles.inputField}
            helperText=""
            label="New Category Name"
            maxLength={100}
            value={categoryDraft}
            onChange={(event) => setCategoryDraft(event.target.value)}
            onKeyDown={handleDraftKeyDown}
          />

          {errorMessage ? (
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className={styles.actions}>
            <Button
              className={styles.createButton}
              disabled={disabled || isCreating}
              onClick={() => void createCategory()}
            >
              {isCreating ? "Creating..." : "Create Category"}
            </Button>
            <Button
              disabled={disabled || isCreating}
              variant="tertiary"
              onClick={() => {
                setCreateOpen(false);
                setErrorMessage(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
