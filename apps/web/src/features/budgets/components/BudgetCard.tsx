"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import styles from "./BudgetCard.module.css";

export type BudgetCardTone = "green" | "cyan" | "yellow" | "navy";

export type BudgetSpendingItem = {
  amount: string;
  avatar: string;
  date: string;
  name: string;
};

type BudgetCardProps = {
  limit: string;
  onDelete?: () => void;
  onEdit?: () => void;
  remaining: string;
  spent: string;
  spendingItems: BudgetSpendingItem[];
  title: string;
  tone: BudgetCardTone;
  usedPercent: number;
};

const toneClassNames: Record<BudgetCardTone, string> = {
  green: styles.toneGreen,
  cyan: styles.toneCyan,
  yellow: styles.toneYellow,
  navy: styles.toneNavy,
};

export function BudgetCard({
  limit,
  onDelete,
  onEdit,
  remaining,
  spent,
  spendingItems,
  title,
  tone,
  usedPercent,
}: BudgetCardProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsMenuId = useId();
  const actionsRef = useRef<HTMLDivElement>(null);
  const safeUsedPercent = Math.max(0, Math.min(100, usedPercent));
  const progressStyle = {
    "--budget-progress": `${safeUsedPercent}%`,
  } as CSSProperties;

  useEffect(() => {
    if (!actionsOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node)
      ) {
        setActionsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActionsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionsOpen]);

  return (
    <article className={styles.card} aria-label={`${title} budget`}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <span
            className={cn(styles.categoryDot, toneClassNames[tone])}
            aria-hidden="true"
          />
          <h2 className={styles.title}>{title}</h2>
        </div>

        <div className={styles.actions} ref={actionsRef}>
          <button
            className={styles.moreButton}
            type="button"
            aria-controls={actionsMenuId}
            aria-expanded={actionsOpen}
            aria-haspopup="menu"
            aria-label={`Open ${title} budget actions`}
            onClick={() => setActionsOpen((current) => !current)}
          >
            <Image src="/images/icon-ellipsis.svg" alt="" width={16} height={16} aria-hidden="true" />
          </button>

          {actionsOpen ? (
            <div className={styles.actionsMenu} id={actionsMenuId} role="menu">
              <button
                className={styles.actionsMenuItem}
                type="button"
                role="menuitem"
                onClick={() => {
                  setActionsOpen(false);
                  onEdit?.();
                }}
              >
                Edit Budget
              </button>
              <div className={styles.actionsMenuDivider} aria-hidden="true" />
              <button
                className={cn(styles.actionsMenuItem, styles.actionsMenuItemDanger)}
                type="button"
                role="menuitem"
                onClick={() => {
                  setActionsOpen(false);
                  onDelete?.();
                }}
              >
                Delete Budget
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className={styles.amountSection}>
        <p className={styles.maximum}>Maximum of {limit}</p>

        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label={`${title} budget spent`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safeUsedPercent}
        >
          <span
            className={cn(styles.progressFill, toneClassNames[tone])}
            style={progressStyle}
          />
        </div>

        <div className={styles.amountDetails}>
          <div className={styles.amountDetail}>
            <span
              className={cn(styles.amountAccent, toneClassNames[tone])}
              aria-hidden="true"
            />
            <div className={styles.amountText}>
              <p className={styles.amountLabel}>Spent</p>
              <p className={styles.amountValue}>{spent}</p>
            </div>
          </div>

          <div className={styles.amountDetail}>
            <span className={styles.remainingAccent} aria-hidden="true" />
            <div className={styles.amountText}>
              <p className={styles.amountLabel}>Remaining</p>
              <p className={styles.amountValue}>{remaining}</p>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.latestPanel} aria-label={`${title} latest spending`}>
        <header className={styles.latestHeader}>
          <h3 className={styles.latestTitle}>Latest Spending</h3>
          <button className={styles.seeAllButton} type="button">
            <span>See All</span>
            <Image src="/images/icon-caret-right.svg" alt="" width={12} height={12} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.spendingList}>
          {spendingItems.map((item, index) => (
            <div className={styles.spendingItemWrap} key={`${item.name}-${item.date}-${item.amount}`}>
              <div className={styles.spendingItem}>
                <div className={styles.spendingIdentity}>
                  <Image
                    className={styles.spendingAvatar}
                    src={item.avatar}
                    alt=""
                    width={32}
                    height={32}
                  />
                  <p className={styles.spendingName}>{item.name}</p>
                </div>

                <div className={styles.spendingMeta}>
                  <p className={styles.spendingAmount}>{item.amount}</p>
                  <p className={styles.spendingDate}>{item.date}</p>
                </div>
              </div>

              {index < spendingItems.length - 1 ? (
                <div className={styles.spendingDivider} aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
