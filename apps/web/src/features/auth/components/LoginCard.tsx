"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/button/Button";
import { InputField } from "@/components/input/InputField";
import styles from "./LoginCard.module.css";

export function LoginCard() {
  const [showPassword, setShowPassword] = useState(false);
  const titleId = useId();

  return (
    <section className={cn("surface-card", styles.card)} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        Login
      </h2>

      <div className={styles.fields}>
        <InputField
          fieldClassName={styles.field}
          helperText=""
          label="Email"
          placeholder=""
          type="email"
        />
        <InputField
          fieldClassName={styles.field}
          helperText=""
          icon={showPassword ? "hide-password" : "show-password"}
          iconAriaLabel={showPassword ? "Hide password" : "Show password"}
          label="Password"
          onIconClick={() => setShowPassword((current) => !current)}
          placeholder=""
          type={showPassword ? "text" : "password"}
        />
      </div>

      <Button className={styles.submitButton}>Login</Button>

      <div className={styles.footer}>
        <span className={styles.footerText}>Need to create an account?</span>
        <Link href="/signup" className={styles.footerLink}>
          Sign Up
        </Link>
      </div>
    </section>
  );
}