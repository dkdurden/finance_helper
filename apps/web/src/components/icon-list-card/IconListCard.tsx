import Image from "next/image";
import { useId } from "react";
import { cn } from "@/lib/cn";
import styles from "./IconListCard.module.css";

const iconToneClassNames = {
  green: styles.iconGreen,
  yellow: styles.iconYellow,
  cyan: styles.iconCyan,
  navy: styles.iconNavy,
  red: styles.iconRed,
  purple: styles.iconPurple,
  "purple-alt": styles.iconPurpleAlt,
  turquoise: styles.iconTurquoise,
  brown: styles.iconBrown,
  magenta: styles.iconMagenta,
  blue: styles.iconBlue,
  "navy-grey": styles.iconNavyGrey,
  "army-green": styles.iconArmyGreen,
  gold: styles.iconGold,
  orange: styles.iconOrange,
} as const;

export type IconListCardTone = keyof typeof iconToneClassNames;

export type IconListCardItem = {
  id: string;
  iconLabel?: string;
  iconSrc?: string;
  iconTone: IconListCardTone;
  label: string;
};

type IconListCardProps = {
  className?: string;
  items: IconListCardItem[];
  title: string;
};

function splitIntoColumns(items: IconListCardItem[]) {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

export function IconListCard({ className, items, title }: IconListCardProps) {
  const columns = splitIntoColumns(items);
  const titleId = useId();

  return (
    <section className={cn(styles.card, className)} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        {title}
      </h2>
      <div className={styles.columns}>
        {columns.map((columnItems, columnIndex) => (
          <ul key={columnIndex} className={styles.list}>
            {columnItems.map((item) => (
              <li key={item.id} className={styles.item}>
                <span
                  className={cn(styles.icon, !item.iconSrc && iconToneClassNames[item.iconTone])}
                  aria-hidden="true"
                >
                  {item.iconSrc ? (
                    <Image
                      src={item.iconSrc}
                      alt=""
                      width={40}
                      height={40}
                      className={styles.iconImage}
                    />
                  ) : (
                    <span className={styles.iconGlyph}>{item.iconLabel ?? "?"}</span>
                  )}
                </span>
                <span className={styles.label}>{item.label}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
