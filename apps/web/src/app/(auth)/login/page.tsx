import type { Metadata } from "next";
import { LoginCard } from "@/features/auth/components/LoginCard";

export const metadata: Metadata = {
  title: "Login | Finance Helper",
  description: "Sign in to Finance Helper to manage transactions, receipts, and balances.",
};

export default function LoginPage() {
  return <LoginCard />;
}