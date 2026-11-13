import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { myTrips } from "@/services/trips";
import { AccountSettings } from "@/components/account/account-settings";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account & privacy", robots: { index: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user)
    return (
      <div className="container-x max-w-xl pt-16">
        <h1 className="text-4xl">Account</h1>
        <p className="mt-3 text-muted">You're browsing as a visitor. A private guest profile is created automatically the first time you save something.</p>
        <div className="mt-6 flex gap-2"><ButtonLink href="/login">Sign in</ButtonLink><ButtonLink href="/register" variant="outline">Create account</ButtonLink></div>
      </div>
    );
  const trips = myTrips(user.id);
  return (
    <div className="container-x max-w-3xl pt-12">
      <h1 className="text-4xl">Account &amp; privacy</h1>
      <p className="mt-2 text-muted">{user.isGuest ? "Guest profile: stored on this browser only. Create an account to keep it." : `Signed in as ${user.email}`}</p>
      {user.isGuest && <ButtonLink href="/register" className="mt-4">Create an account to keep your data</ButtonLink>}
      <AccountSettings displayName={user.displayName} avatarColor={user.avatarColor} isGuest={user.isGuest} />
      <section className="mt-10">
        <h2 className="text-2xl">Your trips</h2>
        {trips.length ? (
          <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-surface">
            {trips.map(({ trip, member }) => (
              <li key={trip.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link href={`/group/${trip.id}`} className="font-medium hover:text-accent">{trip.name}</Link>
                <span className="text-muted capitalize">{member.role}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No trips yet.</p>
        )}
      </section>
    </div>
  );
}
