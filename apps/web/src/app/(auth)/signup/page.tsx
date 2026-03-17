import type { Metadata } from "next";
import { SignUpCard } from "@/features/auth/components/SignUpCard";

export const metadata: Metadata = {
  title: "Sign Up | Finance Helper",
  description: "Create a Finance Helper account to track your spending, receipts, and balances.",
};

export default function SignUpPage() {
  return <SignUpCard />;
}