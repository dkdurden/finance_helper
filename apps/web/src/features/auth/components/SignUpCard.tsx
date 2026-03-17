"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/button/Button";
import { InputField } from "@/components/input/InputField";
import styles from "./SignUpCard.module.css";

function flattenErrorMessages(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenErrorMessages(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => flattenErrorMessages(item));
  }

  return [];
}

export function SignUpCard() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const titleId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = flattenErrorMessages(data)[0] ?? "Unable to create your account right now.";
        setErrorMessage(message);
        return;
      }

      setSuccessMessage("Account created. You can log in once login is wired up.");
      setName("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
    } catch {
      setErrorMessage("Unable to create your account right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={cn("surface-card", styles.card)} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        Sign Up
      </h2>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.fields}>
          <InputField
            fieldClassName={styles.field}
            helperText=""
            label="Name"
            onChange={(event) => setName(event.target.value)}
            placeholder=""
            type="text"
            value={name}
          />
          <InputField
            fieldClassName={styles.field}
            helperText=""
            label="Email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder=""
            type="email"
            value={email}
          />
          <InputField
            fieldClassName={styles.field}
            helperText="Passwords must be at least 8 characters"
            icon={showPassword ? "hide-password" : "show-password"}
            iconAriaLabel={showPassword ? "Hide password" : "Show password"}
            label="Create Password"
            onChange={(event) => setPassword(event.target.value)}
            onIconClick={() => setShowPassword((current) => !current)}
            placeholder=""
            type={showPassword ? "text" : "password"}
            value={password}
          />
        </div>

        {errorMessage ? (
          <p className={styles.errorMessage} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? <p className={styles.successMessage}>{successMessage}</p> : null}

        <Button className={styles.submitButton} disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <div className={styles.footer}>
        <span className={styles.footerText}>Already have an account?</span>
        <Link href="/login" className={styles.footerLink}>
          Login
        </Link>
      </div>
    </section>
  );
}
