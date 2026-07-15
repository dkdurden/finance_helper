import { AppShell } from "@/components/layout/AppShell";
import { OverviewSummaryCard } from "@/features/overview/components/OverviewSummaryCard";
import styles from "./page.module.css";

export default function OverviewLoading() {
  return (
    <AppShell title="Overview">
      <section
        className={styles.summaryGrid}
        aria-busy="true"
        aria-label="Overview balance is loading"
      >
        <OverviewSummaryCard label="Current Balance" value="Loading..." primary />
        <OverviewSummaryCard label="Income" value="$0.00" />
        <OverviewSummaryCard label="Expenses" value="$0.00" />
      </section>
    </AppShell>
  );
}
