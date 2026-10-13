"use client";

import { Fragment, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import styles from "./Pagination.module.css";

type PaginationProps = {
  className?: string;
  currentPage?: number;
  defaultPage?: number;
  mobileCompact?: boolean;
  onPageChange?: (page: number) => void;
  pageQueryParam?: string;
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
  mobileCompact = false,
  onPageChange,
  pageQueryParam,
  totalPages = 5,
}: PaginationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeTotalPages = Math.max(1, Math.trunc(totalPages));
  const safeDefaultPage = clampPage(Math.trunc(defaultPage), safeTotalPages);
  const safeCurrentPage = clampPage(Math.trunc(currentPage ?? safeDefaultPage), safeTotalPages);
  const [internalPage, setInternalPage] = useState(safeDefaultPage);
  const isControlled = currentPage !== undefined;
  const safeInternalPage = clampPage(internalPage, safeTotalPages);
  const activePage = isControlled ? safeCurrentPage : safeInternalPage;
  const pages = Array.from({ length: safeTotalPages }, (_, index) => index + 1);
  const compactPages = Array.from(new Set([1, 2, safeTotalPages])).filter(
    (page) => page <= safeTotalPages,
  );

  function handlePageChange(page: number) {
    const nextPage = clampPage(page, safeTotalPages);

    if (nextPage === activePage) {
      return;
    }

    if (!isControlled) {
      setInternalPage(nextPage);
    }

    if (pageQueryParam) {
      const nextSearchParams = new URLSearchParams(searchParams.toString());

      if (nextPage === 1) {
        nextSearchParams.delete(pageQueryParam);
      } else {
        nextSearchParams.set(pageQueryParam, String(nextPage));
      }

      const query = nextSearchParams.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
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

      <div className={styles.pageList} data-mobile-compact={mobileCompact || undefined}>
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

      {mobileCompact ? (
        <div className={styles.compactPageList}>
          {compactPages.map((page, index) => (
            <Fragment key={page}>
              {index > 0 && page - compactPages[index - 1] > 1 ? (
                <span className={styles.pageButton} aria-hidden="true">
                  ...
                </span>
              ) : null}
              <button
                type="button"
                className={styles.pageButton}
                aria-label={page === activePage ? `Page ${page}, current page` : `Go to page ${page}`}
                data-active={page === activePage || undefined}
                aria-current={page === activePage ? "page" : undefined}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            </Fragment>
          ))}
        </div>
      ) : null}

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
