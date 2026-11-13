import type { Metadata } from "next";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-x max-w-md pt-16">
      <h1 className="text-4xl">Sign in</h1>
      <p className="mt-2 text-muted">Use your Vietnam Atlas account to access your trips from another browser.</p>
      <AuthForm mode="login" next={next} />
      
    </div>
  );
}
