"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import styles from "./Pagination.module.css";

type PaginationProps = {
  className?: string;
  currentPage?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  totalPages?: number;
};

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), totalPages);
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <span
      className={cn(styles.chevron, direction === "left" && styles.chevronLeft)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 6 11" focusable="false">
        <path d="m.853506.146465 5.000004 5.000005c.04648.04643.08336.10158.10853.16228.02516.06069.03811.12576.03811.19147 0 .0657-.01295.13077-.03811.19147-.02517.06069-.06205.11584-.10853.16228l-5.000004 5.00003c-.069927.07-.159054.1177-.256097.137-.097042.0193-.197637.0094-.289048-.0285-.091412-.0378-.16953-.102-.2244652-.1843-.0549354-.0823-.08421767-.179-.08413981-.278l-.00000043-9.999984c-.00007788-.098949.02920444-.195695.08413984-.277992.0549356-.082297.1330536-.1464431.2244646-.1843193.091412-.03787611.192007-.04777907.289049-.02845381.097042.01932521.186169.06700801.256097.13701411z" />
      </svg>
    </span>
  );
}

export function Pagination({
  className,
  currentPage,
  defaultPage = 2,
  onPageChange,
  totalPages = 5,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, Math.trunc(totalPages));
  const safeDefaultPage = clampPage(Math.trunc(defaultPage), safeTotalPages);
  const safeCurrentPage = clampPage(Math.trunc(currentPage ?? safeDefaultPage), safeTotalPages);
  const [internalPage, setInternalPage] = useState(safeDefaultPage);
  const isControlled = currentPage !== undefined;
  const safeInternalPage = clampPage(internalPage, safeTotalPages);
  const activePage = isControlled ? safeCurrentPage : safeInternalPage;
  const pages = Array.from({ length: safeTotalPages }, (_, index) => index + 1);

  function handlePageChange(page: number) {
    const nextPage = clampPage(page, safeTotalPages);

    if (nextPage === activePage) {
      return;
    }

    if (!isControlled) {
      setInternalPage(nextPage);
    }

    onPageChange?.(nextPage);
  }

  return (
    <nav className={cn(styles.pagination, className)} aria-label="Pagination">
      <button
        type="button"
        className={styles.navButton}
        aria-label="Go to previous page"
        onClick={() => handlePageChange(activePage - 1)}
        disabled={activePage === 1}
      >
        <Chevron direction="left" />
        <span>Prev</span>
      </button>

      <div className={styles.pageList}>
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={styles.pageButton}
            aria-label={page === activePage ? `Page ${page}, current page` : `Go to page ${page}`}
            data-active={page === activePage || undefined}
            aria-current={page === activePage ? "page" : undefined}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.navButton}
        aria-label="Go to next page"
        onClick={() => handlePageChange(activePage + 1)}
        disabled={activePage === safeTotalPages}
      >
        <span>Next</span>
        <Chevron direction="right" />
      </button>
    </nav>
  );
}
