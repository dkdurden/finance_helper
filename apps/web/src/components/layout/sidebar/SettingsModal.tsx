"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/button/Button";
import styles from "./Sidebar.module.css";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const titleId = useId();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setErrorMessage(null);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function handleLogout() {
    setIsLoggingOut(true);
    setErrorMessage(null);

    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        method: "GET",
        cache: "no-store",
      });

      if (!csrfResponse.ok) {
        throw new Error("CSRF initialization failed.");
      }

      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      router.push("/login");
      router.refresh();
    } catch {
      setErrorMessage("Unable to log out right now.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={styles.settingsDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className={styles.modalClose}
          onClick={onClose}
          aria-label="Close settings"
        >
          <Image
            src="/images/icon-close-modal.svg"
            alt=""
            width={16}
            height={16}
            aria-hidden="true"
          />
        </button>

        <div className={styles.settingsContent}>
          <div>
            <h2 className={styles.settingsTitle} id={titleId}>
              Settings
            </h2>
            <p className={styles.settingsDescription}>
              Manage your current app session.
            </p>
          </div>

          {errorMessage ? (
            <p className={styles.logoutError} role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className={styles.settingsActions}>
            <Button
              className={styles.logoutButton}
              disabled={isLoggingOut}
              onClick={handleLogout}
              variant="destroy"
            >
              {isLoggingOut ? "Logging Out..." : "Logout"}
            </Button>
            <Button disabled={isLoggingOut} onClick={onClose} variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
