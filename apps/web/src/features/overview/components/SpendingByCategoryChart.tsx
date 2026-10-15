"use client";

import { Cell, Pie, PieChart } from "recharts";
import styles from "./BudgetDonutChart.module.css";

type SpendingSegment = {
  color: string;
  name: string;
  value: number;
};

type SpendingByCategoryChartProps = {
  segments: SpendingSegment[];
  totalLabel: string;
};

const CHART_SIZE = 240;

export function SpendingByCategoryChart({
  segments,
  totalLabel,
}: SpendingByCategoryChartProps) {
  return (
    <div
      className={styles.chartFrame}
      aria-label={`${totalLabel} spent across ${segments.length} category groups`}
      role="img"
    >
      <PieChart width={CHART_SIZE} height={CHART_SIZE} aria-hidden="true">
        <Pie
          data={segments}
          dataKey="value"
          cx="50%"
          cy="50%"
          startAngle={90}
          endAngle={-270}
          innerRadius={77}
          outerRadius={120}
          isAnimationActive={false}
          stroke="none"
        >
          {segments.map((segment) => (
            <Cell key={segment.name} fill={segment.color} />
          ))}
        </Pie>
      </PieChart>
      <div className={styles.chartCenter}>
        <p className={styles.chartValue}>{totalLabel}</p>
        <p className={styles.chartLimit}>spent this month</p>
      </div>
    </div>
  );
}
