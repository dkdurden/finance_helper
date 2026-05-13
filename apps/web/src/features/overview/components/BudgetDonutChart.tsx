"use client";

import { Cell, Pie, PieChart } from "recharts";
import styles from "./BudgetDonutChart.module.css";

type BudgetSegment = {
  name: string;
  limitAmount: number;
  color: string;
};

const CHART_SIZE = 240;
const MAIN_RING_INNER_RADIUS = 77;
const MAIN_RING_OUTER_RADIUS = 120;
const INNER_BAND_OUTER_RADIUS = 93;

const budgetSegments: BudgetSegment[] = [
  {
    name: "Entertainment",
    limitAmount: 50,
    color: "var(--color-green)",
  },
  {
    name: "Bills",
    limitAmount: 750,
    color: "var(--color-cyan)",
  },
  {
    name: "Dining Out",
    limitAmount: 75,
    color: "var(--color-yellow)",
  },
  {
    name: "Personal Care",
    limitAmount: 100,
    color: "var(--color-navy)",
  },
];

export function BudgetDonutChart() {
  return (
    <div className={styles.chartFrame} aria-label="$338 spent of $975 budget limit" role="img">
      <PieChart width={CHART_SIZE} height={CHART_SIZE} aria-hidden="true">
        <Pie
          data={budgetSegments}
          dataKey="limitAmount"
          cx="50%"
          cy="50%"
          startAngle={90}
          endAngle={-270}
          innerRadius={MAIN_RING_INNER_RADIUS}
          outerRadius={MAIN_RING_OUTER_RADIUS}
          paddingAngle={0}
          isAnimationActive={false}
          stroke="none"
        >
          {budgetSegments.map((segment) => (
            <Cell key={segment.name} fill={segment.color} />
          ))}
        </Pie>

        <Pie
          data={budgetSegments}
          dataKey="limitAmount"
          cx="50%"
          cy="50%"
          startAngle={90}
          endAngle={-270}
          innerRadius={MAIN_RING_INNER_RADIUS}
          outerRadius={INNER_BAND_OUTER_RADIUS}
          paddingAngle={0}
          isAnimationActive={false}
          stroke="none"
          opacity={0.42}
        >
          {budgetSegments.map((segment) => (
            <Cell key={`${segment.name}-inner`} fill="var(--color-beige-100)" />
          ))}
        </Pie>
      </PieChart>

      <div className={styles.chartCenter}>
        <p className={styles.chartValue}>$338</p>
        <p className={styles.chartLimit}>of $975 limit</p>
      </div>
    </div>
  );
}
