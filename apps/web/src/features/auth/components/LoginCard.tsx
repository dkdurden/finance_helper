"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/button/Button";
import { InputField } from "@/components/input/InputField";
import styles from "./LoginCard.module.css";

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

export function LoginCard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const titleId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = flattenErrorMessages(data)[0] ?? "Unable to log in right now.";
        setErrorMessage(message);
        return;
      }

      router.push("/overview");
    } catch {
      setErrorMessage("Unable to log in right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={cn("surface-card", styles.card)} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        Login
      </h2>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.fields}>
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
            helperText=""
            icon={showPassword ? "hide-password" : "show-password"}
            iconAriaLabel={showPassword ? "Hide password" : "Show password"}
            label="Password"
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

        <Button className={styles.submitButton} disabled={isSubmitting} type="submit">
          {isSubmitting ? "Logging In..." : "Login"}
        </Button>
      </form>

      <div className={styles.footer}>
        <span className={styles.footerText}>Need to create an account?</span>
        <Link href="/signup" className={styles.footerLink}>
          Sign Up
        </Link>
      </div>
    </section>
  );
}
