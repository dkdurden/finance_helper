import Image from "next/image";
import { Button } from "@/components/button/Button";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./page.module.css";

const pots = [
  {
    name: "Savings",
    saved: "$159.00",
    percent: "7.95%",
    target: "Target of $2,000",
    progress: 7.95,
    accentClass: styles.accentGreen,
  },
  {
    name: "Concert Ticket",
    saved: "$110.00",
    percent: "73.3%",
    target: "Target of $150",
    progress: 73.3,
    accentClass: styles.accentNavy,
  },
  {
    name: "Gift",
    saved: "$40.00",
    percent: "66.6%",
    target: "Target of $60",
    progress: 66.6,
    accentClass: styles.accentCyan,
  },
  {
    name: "New Laptop",
    saved: "$10.00",
    percent: "1.0%",
    target: "Target of $1,000",
    progress: 1,
    accentClass: styles.accentYellow,
  },
  {
    name: "Holiday",
    saved: "$531.00",
    percent: "36.8%",
    target: "Target of $1440",
    progress: 36.8,
    accentClass: styles.accentPurple,
  },
];

export default function PotsPage() {
  return (
    <AppShell
      title="Pots"
      headerAction={<Button>+ Add New Pot</Button>}
    >
      <section className={styles.potsGrid} aria-label="Pots list">
        {pots.map((pot) => (
          <article className={styles.potCard} key={pot.name} aria-label={`${pot.name} pot`}>
            <header className={styles.cardHeader}>
              <div className={styles.titleWrap}>
                <span
                  className={`${styles.potDot} ${pot.accentClass}`}
                  aria-hidden="true"
                />
                <h2 className={styles.cardTitle}>{pot.name}</h2>
              </div>

              <button className={styles.moreButton} type="button" aria-label={`Open ${pot.name} pot actions`}>
                <Image src="/images/icon-ellipsis.svg" alt="" width={16} height={16} aria-hidden="true" />
              </button>
            </header>

            <div className={styles.progressSection}>
              <div className={styles.savedRow}>
                <p className={styles.savedLabel}>Total Saved</p>
                <p className={styles.savedValue}>{pot.saved}</p>
              </div>

              <div className={styles.progressWrap}>
                <div
                  className={styles.progressTrack}
                  role="progressbar"
                  aria-label={`${pot.name} savings progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pot.progress}
                >
                  <span
                    className={`${styles.progressFill} ${pot.accentClass}`}
                    style={{ width: `${pot.progress}%` }}
                  />
                </div>

                <div className={styles.targetRow}>
                  <p className={styles.percent}>{pot.percent}</p>
                  <p className={styles.target}>{pot.target}</p>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <Button className={styles.actionButton} variant="secondary">
                + Add Money
              </Button>
              <Button className={styles.actionButton} variant="secondary">
                Withdraw
              </Button>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
