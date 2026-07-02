import Image from "next/image";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import styles from "./layout.module.css";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/overview");
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.brandPanel} aria-label="Finance Helper introduction">
          <div className={styles.artworkLayer} aria-hidden="true">
            <Image
              src="/images/illustration-authentication.svg"
              alt=""
              fill
              className={styles.artwork}
              priority
            />
          </div>
          <div className={styles.brandOverlay}>
            <Image
              src="/images/logo-large.svg"
              alt="Finance Helper"
              width={122}
              height={22}
              className={styles.logo}
              priority
            />
            <div className={styles.brandCopy}>
              <h2 className={styles.brandTitle}>
                Keep track of your money and save for your future
              </h2>
              <p className={styles.brandDescription}>
                Personal finance app puts you in control of your spending. Track
                transactions, set budgets, and add to savings pots easily.
              </p>
            </div>
          </div>
        </aside>
        <section className={styles.content}>{children}</section>
      </section>
    </main>
  );
}