"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AccountDeleteModal } from "./AccountDeleteModal";
import { AccountModal, type EditableAccount } from "./AccountModal";
import styles from "./AccountEditControl.module.css";

type AccountEditControlProps = {
  account: EditableAccount;
};

export function AccountEditControl({ account }: AccountEditControlProps) {
  const menuId = useId();
  const controlRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"delete" | "edit" | null>(null);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

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

  return (
    <div className={styles.actions} ref={controlRef}>
      <button
        ref={menuButtonRef}
        className={styles.moreButton}
        type="button"
        aria-controls={menuId}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={"Open " + account.name + " account actions"}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <Image src="/images/icon-ellipsis.svg" alt="" width={16} height={16} aria-hidden="true" />
      </button>

      {menuOpen ? (
        <div className={styles.actionsMenu} id={menuId} role="menu">
          <button
            className={styles.actionsMenuItem}
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setActiveModal("edit");
            }}
          >
            Edit Account
          </button>
          <button
            className={[styles.actionsMenuItem, styles.actionsMenuItemDanger].join(" ")}
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setActiveModal("delete");
            }}
          >
            Delete Account
          </button>
        </div>
      ) : null}

      {activeModal === "edit" ? (
        <AccountModal account={account} mode="edit" onClose={closeModal} />
      ) : null}
      {activeModal === "delete" ? (
        <AccountDeleteModal account={account} onClose={closeModal} />
      ) : null}
    </div>
  );
}
