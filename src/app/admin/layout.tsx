import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Each admin page authorises itself and redirects to login with its own address as `next`.
  if (!user || user.isGuest) return <>{children}</>;
  if (!isAdmin(user))
    return (
      <div className="container-x max-w-xl py-24 text-center">
        <h1 className="text-3xl">Admin access required</h1>
        <p className="mt-3 text-muted">Your account doesn't have a content editor or super admin role.</p>
        <Link href="/" className="mt-6 inline-block text-accent underline">Back to Vietnam Atlas</Link>
      </div>
    );
  return (
    <div className="container-x pt-6">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <AdminNav role={user.role} name={user.displayName} />
        <div className="min-w-0 pb-10">{children}</div>
      </div>
    </div>
  );
}
