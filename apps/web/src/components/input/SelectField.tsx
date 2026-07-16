"use client";

import {
  useId,
  useState,
  type ChangeEventHandler,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import fieldStyles from "./InputField.module.css";
import styles from "./SelectField.module.css";

export type SelectOption = {
  color: string;
  label: string;
  value: string;
};

type SelectFieldProps = {
  className?: string;
  defaultValue?: string;
  helperText?: string;
  id?: string;
  label?: string;
  noneLabel?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  options?: SelectOption[];
  placeholder?: string;
  value?: string;
} & Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children" | "className" | "defaultValue" | "id" | "onChange" | "value"
>;

const defaultOptions: SelectOption[] = [
  { value: "entertainment", label: "Entertainment", color: "var(--color-green)" },
  { value: "groceries", label: "Groceries", color: "var(--color-cyan)" },
  { value: "transport", label: "Transport", color: "var(--color-yellow)" },
];

export function SelectField({
  className,
  defaultValue = "",
  helperText = "Helper text",
  id,
  label = "Field With Color Tag",
  noneLabel = "None",
  onChange,
  options = defaultOptions,
  placeholder = "Placeholder",
  value,
  ...selectProps
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const helperTextId = selectId + "-help";
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const selectedValue = value ?? uncontrolledValue;
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
          onChange={(event) => {
            if (value === undefined) {
              setUncontrolledValue(event.target.value);
            }

            onChange?.(event);
          }}
          {...selectProps}
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
      <span className={fieldStyles.helperText} id={helperText ? helperTextId : undefined}>
        {helperText}
      </span>
    </div>
  );
}
