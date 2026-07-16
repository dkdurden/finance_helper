"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/button/Button";
import { AccountModal } from "./AccountModal";

export function AccountCreateControl() {
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    requestAnimationFrame(() => {
      triggerWrapRef.current?.querySelector("button")?.focus();
    });
  }, []);

  return (
    <div ref={triggerWrapRef}>
      <Button onClick={() => setModalOpen(true)}>+ Add Account</Button>
      {modalOpen ? <AccountModal mode="create" onClose={closeModal} /> : null}
    </div>
  );
}