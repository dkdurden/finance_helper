"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/button/Button";
import { InputField } from "@/components/input/InputField";
import styles from "./SignUpCard.module.css";

export function SignUpCard() {
  const [showPassword, setShowPassword] = useState(false);
  const titleId = useId();

  return (
    <section className={cn("surface-card", styles.card)} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        Sign Up
      </h2>

      <div className={styles.fields}>
        <InputField
          fieldClassName={styles.field}
          helperText=""
          label="Name"
          placeholder=""
          type="text"
        />
        <InputField
          fieldClassName={styles.field}
          helperText=""
          label="Email"
          placeholder=""
          type="email"
        />
        <InputField
          fieldClassName={styles.field}
          helperText="Passwords must be at least 8 characters"
          icon={showPassword ? "hide-password" : "show-password"}
          iconAriaLabel={showPassword ? "Hide password" : "Show password"}
          label="Create Password"
          onIconClick={() => setShowPassword((current) => !current)}
          placeholder=""
          type={showPassword ? "text" : "password"}
        />
      </div>

      <Button className={styles.submitButton}>Create Account</Button>

      <div className={styles.footer}>
        <span className={styles.footerText}>Already have an account?</span>
        <Link href="/login" className={styles.footerLink}>
          Login
        </Link>
      </div>
    </section>
  );
}