"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./SortDropdown.module.css";

type DropdownOption = {
  label: string;
  value: string;
};

type SortDropdownProps = {
  ariaLabel: string;
  minWidth?: "compact" | "wide";
  options: DropdownOption[];
};

export function SortDropdown({ ariaLabel, minWidth = "compact", options }: SortDropdownProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(options[0]?.value ?? "");
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div className={`${styles.root} ${minWidth === "wide" ? styles.rootWide : ""}`} ref={rootRef}>
      <button
        className={styles.trigger}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <span>{selectedOption?.label}</span>
        <span className={styles.caret} aria-hidden="true" />
      </button>

      {open ? (
        <div className={styles.menu} id={listboxId} role="listbox" tabIndex={-1}>
          {options.map((option) => (
            <button
              className={styles.option}
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === selectedValue}
              onClick={() => {
                setSelectedValue(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
