import styles from "./OverviewSummaryCard.module.css";

type OverviewSummaryCardProps = {
  label: string;
  value: string;
  primary?: boolean;
};

export function OverviewSummaryCard({
  label,
  value,
  primary = false,
}: OverviewSummaryCardProps) {
  const cardClassName = primary
    ? `${styles.card} ${styles.cardPrimary}`
    : `${styles.card} ${styles.cardSecondary}`;

  return (
    <article className={cardClassName}>
      <div className={styles.content}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
      </div>
    </article>
  );
}
