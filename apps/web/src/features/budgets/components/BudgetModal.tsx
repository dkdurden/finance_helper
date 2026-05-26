"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/button/Button";
import { cn } from "@/lib/cn";
import styles from "./BudgetModal.module.css";

type BudgetModalProps = {
  mode?: "add" | "delete" | "edit";
  onClose: () => void;
};

const categoryOptions = [
  "Entertainment",
  "Bills",
  "Groceries",
  "Dining Out",
  "Transportation",
  "Personal Care",
  "Education",
  "Lifestyle",
  "Shopping",
  "General",
];

const themeOptions = [
  { label: "Green", value: "green", color: "var(--color-green)", used: true },
  { label: "Yellow", value: "yellow", color: "var(--color-yellow)", used: true },
  { label: "Cyan", value: "cyan", color: "var(--color-cyan)", used: true },
  { label: "Navy", value: "navy", color: "var(--color-navy)", used: true },
  { label: "Red", value: "red", color: "var(--color-red)" },
  { label: "Purple", value: "purple", color: "var(--color-purple)" },
  { label: "Turquoise", value: "turquoise", color: "var(--color-turquoise)" },
  { label: "Brown", value: "brown", color: "var(--color-brown)" },
  { label: "Magenta", value: "magenta", color: "var(--color-magenta)" },
  { label: "Blue", value: "blue", color: "var(--color-blue)" },
  { label: "Grey", value: "grey", color: "var(--color-navy-grey)" },
  { label: "Army", value: "army", color: "var(--color-army-green)" },
  { label: "Pink", value: "pink", color: "var(--color-purple-alt)" },
  { label: "Gold", value: "gold", color: "var(--color-gold)" },
  { label: "Orange", value: "orange", color: "var(--color-orange)" },
];

const modalContent = {
  add: {
    amountDefaultValue: "",
    amountPlaceholder: "e.g. 2000",
    description:
      "Choose a category to set a spending budget. These categories can help you monitor spending.",
    submitLabel: "Add Budget",
    title: "Add New Budget",
  },
  edit: {
    amountDefaultValue: "50.00",
    amountPlaceholder: undefined,
    description:
      "As your budgets change, feel free to update your spending limits.",
    submitLabel: "Save Changes",
    title: "Edit Budget",
  },
};

export function BudgetModal({ mode = "add", onClose }: BudgetModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const categoryDropdownId = useId();
  const themeDropdownId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const content = mode === "delete" ? null : modalContent[mode];
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categoryOptions[0]);
  const [themeOpen, setThemeOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(themeOptions[0]);
  const themeSwatchStyle = {
    "--budget-theme-color": selectedTheme.color,
  } as CSSProperties;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (categoryOpen) {
          setCategoryOpen(false);
          return;
        }

        if (themeOpen) {
          setThemeOpen(false);
          return;
        }

        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [categoryOpen, onClose, themeOpen]);

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            {mode === "delete" ? "Delete 'Entertainment'?" : content.title}
          </h2>
          <button
            className={styles.closeButton}
            type="button"
            aria-label={`Close ${mode === "delete" ? "Delete Budget" : content.title} modal`}
            onClick={onClose}
          >
            <Image src="/images/icon-close-modal.svg" alt="" width={32} height={32} aria-hidden="true" />
          </button>
        </header>

        <p className={styles.description} id={descriptionId}>
          {mode === "delete"
            ? "Are you sure you want to delete this budget? This action cannot be reversed, and all the data inside it will be removed forever."
            : content.description}
        </p>

        {mode === "delete" ? (
          <div className={styles.deleteActions}>
            <Button className={styles.submitButton} variant="destroy" onClick={onClose}>
              Yes, Confirm Deletion
            </Button>
            <Button className={styles.cancelButton} variant="tertiary" onClick={onClose}>
              No, Go Back
            </Button>
          </div>
        ) : (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              onClose();
            }}
          >
            <label className={styles.field}>
              <span className={styles.label}>Budget Category</span>
              <span className={styles.selectWrap}>
                <button
                  className={cn(styles.select, styles.dropdownButton)}
                  type="button"
                  aria-controls={categoryDropdownId}
                  aria-expanded={categoryOpen}
                  aria-haspopup="listbox"
                  onClick={() => {
                    setCategoryOpen((current) => !current);
                    setThemeOpen(false);
                  }}
                >
                  <span>{selectedCategory}</span>
                </button>

                {categoryOpen ? (
                  <div className={styles.dropdown} id={categoryDropdownId} role="listbox">
                    {categoryOptions.map((category, index) => (
                      <div className={styles.dropdownOptionWrap} key={category}>
                        <button
                          className={styles.dropdownOption}
                          type="button"
                          role="option"
                          aria-selected={selectedCategory === category}
                          onClick={() => {
                            setSelectedCategory(category);
                            setCategoryOpen(false);
                          }}
                        >
                          {category}
                        </button>

                        {index < categoryOptions.length - 1 ? (
                          <span className={styles.dropdownDivider} aria-hidden="true" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Maximum Spend</span>
              <span className={styles.amountWrap}>
                <span className={styles.prefix} aria-hidden="true">
                  $
                </span>
                <input
                  className={styles.input}
                  defaultValue={content.amountDefaultValue}
                  inputMode="decimal"
                  placeholder={content.amountPlaceholder}
                  type="text"
                />
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Theme</span>
              <span className={styles.selectWrap}>
                <button
                  className={cn(styles.select, styles.themeButton)}
                  type="button"
                  aria-controls={themeDropdownId}
                  aria-expanded={themeOpen}
                  aria-haspopup="listbox"
                  onClick={() => {
                    setThemeOpen((current) => !current);
                    setCategoryOpen(false);
                  }}
                >
                  <span
                    className={styles.themeSwatch}
                    style={themeSwatchStyle}
                    aria-hidden="true"
                  />
                  <span>{selectedTheme.label}</span>
                </button>

                {themeOpen ? (
                  <div className={cn(styles.dropdown, styles.themeDropdown)} id={themeDropdownId} role="listbox">
                    {themeOptions.map((theme, index) => {
                      const swatchStyle = {
                        "--budget-theme-color": theme.color,
                      } as CSSProperties;

                      return (
                        <div className={styles.dropdownOptionWrap} key={theme.value}>
                          <button
                            className={cn(styles.dropdownOption, styles.themeOption, theme.used && styles.themeOptionUsed)}
                            type="button"
                            role="option"
                            aria-disabled={theme.used || undefined}
                            aria-selected={selectedTheme.value === theme.value}
                            onClick={() => {
                              if (theme.used) {
                                return;
                              }

                              setSelectedTheme(theme);
                              setThemeOpen(false);
                            }}
                          >
                            <span className={styles.dropdownOptionMain}>
                              <span
                                className={styles.themeSwatch}
                                style={swatchStyle}
                                aria-hidden="true"
                              />
                              <span>{theme.label}</span>
                            </span>
                            {theme.used ? (
                              <span className={styles.themeUsedLabel}>Already used</span>
                            ) : null}
                          </button>

                          {index < themeOptions.length - 1 ? (
                            <span className={styles.dropdownDivider} aria-hidden="true" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </span>
            </label>

            <Button className={styles.submitButton} type="submit">
              {content.submitLabel}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
