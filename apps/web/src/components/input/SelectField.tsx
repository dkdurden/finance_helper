"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import fieldStyles from "./InputField.module.css";
import styles from "./SelectField.module.css";

type SelectOption = {
  color: string;
  label: string;
  value: string;
};

type SelectFieldProps = {
  className?: string;
  helperText?: string;
  id?: string;
  label?: string;
  noneLabel?: string;
  options?: SelectOption[];
  placeholder?: string;
};

const defaultOptions: SelectOption[] = [
  { value: "entertainment", label: "Entertainment", color: "var(--color-green)" },
  { value: "groceries", label: "Groceries", color: "var(--color-cyan)" },
  { value: "transport", label: "Transport", color: "var(--color-yellow)" },
];

export function SelectField({
  className,
  helperText = "Helper text",
  id,
  label = "Field With Color Tag",
  noneLabel = "None",
  options = defaultOptions,
  placeholder = "Placeholder",
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const helperTextId = `${selectId}-help`;
  const [selectedValue, setSelectedValue] = useState("");
  const selectedOption = options.find((option) => option.value === selectedValue);

  return (
    <div
      className={cn(fieldStyles.field, className)}
      data-filled={selectedOption ? true : undefined}
    >
      <label className={fieldStyles.label} htmlFor={selectId}>
        {label}
      </label>
      <div className={styles.control}>
        <span
          className={styles.swatch}
          style={{ backgroundColor: selectedOption?.color ?? "var(--color-green)" }}
          aria-hidden="true"
        />
        <select
          id={selectId}
          aria-describedby={helperText ? helperTextId : undefined}
          className={cn(styles.select, !selectedOption && styles.placeholder)}
          value={selectedValue}
          onChange={(event) => setSelectedValue(event.target.value)}
        >
          <option value="">{noneLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* Keep the native select for keyboard/screen-reader behavior, but render the
            lighter placeholder text separately so only the empty closed state is muted. */}
        {!selectedOption ? (
          <span className={styles.placeholderOverlay} aria-hidden="true">
            {placeholder}
          </span>
        ) : null}
      </div>
      {/* TODO: Add a standard controlled/uncontrolled API plus error-state semantics when this moves from preview usage into real forms. */}
      <span className={fieldStyles.helperText} id={helperText ? helperTextId : undefined}>
        {helperText}
      </span>
    </div>
  );
}
