import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { Pagination } from "@/components/pagination/Pagination";
import { SortDropdown } from "@/features/transactions/components/SortDropdown";
import styles from "./page.module.css";

const transactions = [
  {
    name: "Emma Richardson",
    category: "General",
    date: "19 Aug 2024",
    amount: "+$75.50",
    positive: true,
    avatar: "/images/avatars/emma-richardson.jpg",
  },
  {
    name: "Savory Bites Bistro",
    category: "Dining Out",
    date: "19 Aug 2024",
    amount: "-$55.50",
    positive: false,
    avatar: "/images/avatars/savory-bites-bistro.jpg",
  },
  {
    name: "Daniel Carter",
    category: "General",
    date: "18 Aug 2024",
    amount: "-$42.30",
    positive: false,
    avatar: "/images/avatars/daniel-carter.jpg",
  },
  {
    name: "Sun Park",
    category: "General",
    date: "17 Aug 2024",
    amount: "+$120.00",
    positive: true,
    avatar: "/images/avatars/sun-park.jpg",
  },
  {
    name: "Urban Services Hub",
    category: "General",
    date: "17 Aug 2024",
    amount: "-$65.00",
    positive: false,
    avatar: "/images/avatars/urban-services-hub.jpg",
  },
  {
    name: "Liam Hughes",
    category: "Groceries",
    date: "15 Aug 2024",
    amount: "+$65.75",
    positive: true,
    avatar: "/images/avatars/liam-hughes.jpg",
  },
  {
    name: "Lily Ramirez",
    category: "General",
    date: "14 Aug 2024",
    amount: "+$50.00",
    positive: true,
    avatar: "/images/avatars/lily-ramirez.jpg",
  },
  {
    name: "Ethan Clark",
    category: "Dining Out",
    date: "13 Aug 2024",
    amount: "-$32.50",
    positive: false,
    avatar: "/images/avatars/ethan-clark.jpg",
  },
  {
    name: "James Thompson",
    category: "Entertainment",
    date: "11 Aug 2024",
    amount: "-$5.00",
    positive: false,
    avatar: "/images/avatars/james-thompson.jpg",
  },
  {
    name: "Pixel Playground",
    category: "Entertainment",
    date: "11 Aug 2024",
    amount: "-$10.00",
    positive: false,
    avatar: "/images/avatars/pixel-playground.jpg",
  },
];

const sortOptions = [
  { label: "Latest", value: "latest" },
  { label: "Oldest", value: "oldest" },
  { label: "A to Z", value: "a-to-z" },
  { label: "Z to A", value: "z-to-a" },
  { label: "Highest", value: "highest" },
  { label: "Lowest", value: "lowest" },
];

const categoryOptions = [
  { label: "All Transactions", value: "all" },
  { label: "Entertainment", value: "entertainment" },
  { label: "Bills", value: "bills" },
  { label: "Groceries", value: "groceries" },
  { label: "Dining Out", value: "dining-out" },
  { label: "Transportation", value: "transportation" },
  { label: "Personal Care", value: "personal-care" },
  { label: "Education", value: "education" },
  { label: "Lifestyle", value: "lifestyle" },
  { label: "Shopping", value: "shopping" },
  { label: "General", value: "general" },
];

export default function TransactionsPage() {
  return (
    <AppShell title="Transactions">
      <section className={styles.panel} aria-label="Transactions list and controls">
        <div className={styles.toolbar} aria-label="Transaction controls">
          <label className={styles.searchField}>
            <span className={styles.visuallyHidden}>Search transaction</span>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Search transaction"
            />
            <span className={styles.searchIcon} aria-hidden="true" />
          </label>

          <div className={styles.filters}>
            <div className={styles.filterControl}>
              <span className={styles.filterLabel}>Sort by</span>
              <SortDropdown ariaLabel="Sort transactions" options={sortOptions} />
            </div>

            <div className={styles.filterControl}>
              <span className={styles.filterLabel}>Category</span>
              <SortDropdown
                ariaLabel="Filter transactions by category"
                minWidth="wide"
                options={categoryOptions}
              />
            </div>
          </div>

          <div className={styles.mobileFilterButtons} aria-label="Mobile transaction controls">
            <button className={styles.mobileIconButton} type="button" aria-label="Sort transactions">
              <Image src="/images/icon-sort-mobile.svg" alt="" width={20} height={20} aria-hidden="true" />
            </button>
            <button className={styles.mobileIconButton} type="button" aria-label="Filter transactions by category">
              <Image src="/images/icon-filter-mobile.svg" alt="" width={20} height={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.tableHeader} aria-hidden="true">
          <span>Recipient / Sender</span>
          <span>Category</span>
          <span>Transaction Date</span>
          <span className={styles.amountHeader}>Amount</span>
        </div>

        <div className={styles.transactionList}>
          {transactions.map((transaction) => (
            <article className={styles.transactionRow} key={`${transaction.name}-${transaction.date}-${transaction.amount}`}>
              <div className={styles.recipientCell}>
                <Image
                  className={styles.avatar}
                  src={transaction.avatar}
                  alt=""
                  width={40}
                  height={40}
                />
                <p className={styles.recipientName}>{transaction.name}</p>
              </div>

              <p className={styles.categoryCell}>{transaction.category}</p>
              <p className={styles.dateCell}>{transaction.date}</p>
              <p className={`${styles.amountCell} ${transaction.positive ? styles.amountPositive : ""}`}>
                {transaction.amount}
              </p>
            </article>
          ))}
        </div>

        <Pagination mobileCompact />
      </section>
    </AppShell>
  );
}
