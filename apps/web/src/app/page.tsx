import { Sidebar } from "@/components/sidebar/Sidebar";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <Sidebar />
      <section className={styles.preview} aria-label="Sidebar preview canvas">
        <div className={styles.previewCard}>
          <p className="text-preset-5-bold">Desktop sidebar preview</p>
          <h1>Sidebar foundation</h1>
          <p>
            This slice implements the desktop navigation shell from Figma using
            the shared design tokens in globals.
          </p>
        </div>
      </section>
    </main>
  );
}
