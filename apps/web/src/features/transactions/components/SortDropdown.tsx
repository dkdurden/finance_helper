"use client";

import { usePathname, useRouter } from "next/navigation";
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
  queryParam?: string;
  value?: string;
};

export function SortDropdown({
  ariaLabel,
  minWidth = "compact",
  options,
  queryParam,
  value,
}: SortDropdownProps) {
  const pathname = usePathname();
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(options[0]?.value ?? "");
  const selectedValue = value ?? internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];

  function handleSelection(nextValue: string) {
    if (nextValue === selectedValue) {
      setOpen(false);
      return;
    }

    if (value === undefined) {
      setInternalValue(nextValue);
    }

    if (queryParam) {
      const nextSearchParams = new URLSearchParams(window.location.search);
      const defaultValue = options[0]?.value;

      if (nextValue === defaultValue) {
        nextSearchParams.delete(queryParam);
      } else {
        nextSearchParams.set(queryParam, nextValue);
      }

      nextSearchParams.delete("page");
      const query = nextSearchParams.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }

    setOpen(false);
  }

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
              onClick={() => handleSelection(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
