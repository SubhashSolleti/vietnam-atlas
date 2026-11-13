import type { Metadata } from "next";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <div className="container-x max-w-md pt-16">
      <h1 className="text-4xl">Create an account</h1>
      <p className="mt-2 text-muted">Keep your wishlist, votes and trips when you switch browsers. Anything you've saved as a guest on this browser is kept.</p>
      <AuthForm mode="register" />
    </div>
  );
}
