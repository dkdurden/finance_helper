"use client";

import { useId, useState } from "react";
import Image from "next/image";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import styles from "./InputField.module.css";

type InputFieldProps = {
  helperText?: string;
  icon?: "search";
  label?: string;
  prefix?: string;
} & InputHTMLAttributes<HTMLInputElement>;

function hasInputValue(value: InputHTMLAttributes<HTMLInputElement>["value"] | undefined) {
  if (typeof value === "string") {
    return value.length > 0;
  }

  if (typeof value === "number") {
    return true;
  }

  return Array.isArray(value) ? value.length > 0 : false;
}

export function InputField({
  className,
  defaultValue,
  helperText = "Helper text",
  icon,
  id,
  label = "Basic Field",
  onChange,
  prefix,
  type = "text",
  value,
  ...props
}: InputFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperTextId = `${inputId}-help`;

  // Uncontrolled inputs still own their text value in the DOM. We only track whether
  // the field should render its filled-state styles after the user types.
  // TODO: Revisit autofill/form-reset edge cases if filled styling ever drifts from the DOM value.
  const [uncontrolledFilled, setUncontrolledFilled] = useState(() => hasInputValue(defaultValue));

  // Controlled usage derives filled state from the current value prop. Uncontrolled
  // usage falls back to the local boolean above so the visual state stays in sync.
  const filled = value !== undefined ? hasInputValue(value) : uncontrolledFilled;

  return (
    <label className={styles.field} data-filled={filled || undefined} htmlFor={inputId}>
      <span className={styles.label}>{label}</span>
      <span className={styles.control}>
        {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
        <input
          id={inputId}
          aria-describedby={helperText ? helperTextId : undefined}
          className={cn(
            styles.input,
            icon && styles.inputWithIcon,
            prefix && styles.inputWithPrefix,
            className,
          )}
          defaultValue={defaultValue}
          type={type}
          value={value}
          onChange={(event) => {
            if (value === undefined) {
              setUncontrolledFilled(event.target.value.length > 0);
            }

            // Preserve any parent-supplied change handler in both controlled and
            // uncontrolled usage.
            onChange?.(event);
          }}
          {...props}
        />
        {icon === "search" ? (
          <span className={styles.icon} aria-hidden="true">
            <Image src="/images/icon-search.svg" alt="" width={16} height={16} />
          </span>
        ) : null}
      </span>
      <span className={styles.helperText} id={helperText ? helperTextId : undefined}>
        {helperText}
      </span>
    </label>
  );
}
