import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { SortDropdown } from "@/features/transactions/components/SortDropdown";
import styles from "./page.module.css";

const sortOptions = [
  { label: "Latest", value: "latest" },
  { label: "Oldest", value: "oldest" },
  { label: "A to Z", value: "a-to-z" },
  { label: "Z to A", value: "z-to-a" },
  { label: "Highest", value: "highest" },
  { label: "Lowest", value: "lowest" },
];

const summaryItems = [
  { label: "Paid Bills", value: "4 ($190.00)" },
  { label: "Total Upcoming", value: "4 ($194.98)" },
  { label: "Due Soon", value: "2 ($59.98)", warning: true },
];

const bills = [
  {
    name: "Spark Electric Solutions",
    dueDate: "Monthly - 2nd",
    amount: "$100.00",
    status: "paid",
    avatar: "/images/avatars/spark-electric-solutions.jpg",
  },
  {
    name: "Serenity Spa & Wellness",
    dueDate: "Monthly - 3rd",
    amount: "$30.00",
    status: "paid",
    avatar: "/images/avatars/serenity-spa-and-wellness.jpg",
  },
  {
    name: "Elevate Education",
    dueDate: "Monthly - 4th",
    amount: "$50.00",
    status: "paid",
    avatar: "/images/avatars/elevate-education.jpg",
  },
  {
    name: "Pixel Playground",
    dueDate: "Monthly - 11th",
    amount: "$10.00",
    status: "paid",
    avatar: "/images/avatars/pixel-playground.jpg",
  },
  {
    name: "Nimbus Data Storage",
    dueDate: "Monthly - 21st",
    amount: "$9.99",
    status: "due",
    avatar: "/images/avatars/nimbus-data-storage.jpg",
  },
  {
    name: "ByteWise",
    dueDate: "Monthly - 23rd",
    amount: "$49.99",
    status: "due",
    avatar: "/images/avatars/bytewise.jpg",
  },
  {
    name: "EcoFuel Energy",
    dueDate: "Monthly - 29th",
    amount: "$35.00",
    status: "upcoming",
    avatar: "/images/avatars/ecofuel-energy.jpg",
  },
  {
    name: "Aqua Flow Utilities",
    dueDate: "Monthly - 30th",
    amount: "$100.00",
    status: "upcoming",
    avatar: "/images/avatars/aqua-flow-utilities.jpg",
  },
];

const statusIcon: Record<string, string | null> = {
  due: "/images/icon-bill-due.svg",
  paid: "/images/icon-bill-paid.svg",
  upcoming: null,
};

export default function RecurringBillsPage() {
  return (
    <AppShell title="Recurring Bills">
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Recurring bills summary">
          <section className={styles.totalCard}>
            <Image
              src="/images/icon-recurring-bills.svg"
              alt=""
              width={40}
              height={40}
              aria-hidden="true"
            />
            <div className={styles.totalText}>
              <p className={styles.totalLabel}>Total Bills</p>
              <p className={styles.totalValue}>$384.98</p>
            </div>
          </section>

          <section className={styles.summaryCard} aria-labelledby="recurring-bills-summary">
            <h2 className={styles.summaryTitle} id="recurring-bills-summary">
              Summary
            </h2>
            <div className={styles.summaryList}>
              {summaryItems.map((item) => (
                <div
                  className={`${styles.summaryRow} ${item.warning ? styles.warningText : ""}`}
                  key={item.label}
                >
                  <p>{item.label}</p>
                  <p>{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className={styles.panel} aria-label="Recurring bills list and controls">
          <div className={styles.toolbar} aria-label="Recurring bill controls">
            <label className={styles.searchField}>
              <span className={styles.visuallyHidden}>Search bills</span>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search bills"
              />
              <Image
                className={styles.searchIcon}
                src="/images/icon-search.svg"
                alt=""
                width={16}
                height={16}
                aria-hidden="true"
              />
            </label>

            <div className={styles.filterControl}>
              <span className={styles.filterLabel}>Sort by</span>
              <SortDropdown ariaLabel="Sort recurring bills" options={sortOptions} />
            </div>
          </div>

          <div className={styles.tableHeader} aria-hidden="true">
            <span>Bill Title</span>
            <span>Due Date</span>
            <span className={styles.amountHeader}>Amount</span>
          </div>

          <div className={styles.billList}>
            {bills.map((bill) => (
              <article className={styles.billRow} key={`${bill.name}-${bill.dueDate}`}>
                <div className={styles.billTitleCell}>
                  <Image
                    className={styles.avatar}
                    src={bill.avatar}
                    alt=""
                    width={32}
                    height={32}
                  />
                  <p className={styles.billName}>{bill.name}</p>
                </div>

                <div className={styles.dueDateCell}>
                  <p className={bill.status === "paid" ? styles.paidText : ""}>
                    {bill.dueDate}
                  </p>
                  {statusIcon[bill.status] ? (
                    <Image
                      src={statusIcon[bill.status]}
                      alt=""
                      width={16}
                      height={16}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>

                <p className={`${styles.amountCell} ${bill.status === "due" ? styles.warningText : ""}`}>
                  {bill.amount}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
