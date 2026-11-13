import "@fontsource-variable/inter";
import "@fontsource-variable/playfair-display";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { BottomNav } from "@/components/site/bottom-nav";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { FxProvider } from "@/components/site/fx";
import { UserStateProvider } from "@/components/site/user-state";
import { ConfirmProvider } from "@/components/ui/confirm";
import { ToastProvider } from "@/components/ui/toast";
import { getCurrentUser } from "@/lib/auth";
import { getFx } from "@/services/settings";
import { getUserState } from "@/services/user-state";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Vietnam Atlas: Discover More. Experience Vietnam. Plan Together.", template: "%s · Vietnam Atlas" },
  description:
    "Discover Vietnam's destinations, attractions and experiences with prices, seasons and logistics, then shortlist, vote and build a shared itinerary with your group.",
  openGraph: { type: "website", siteName: "Vietnam Atlas", locale: "en_GB" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5EF" },
    { media: "(prefers-color-scheme: dark)", color: "#111613" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const user = await getCurrentUser();
  const themeCookie = jar.get("atlas_theme")?.value;
  const theme = (["light", "dark", "system"].includes(themeCookie ?? "") ? themeCookie : (user?.theme ?? "system")) as "light" | "dark" | "system";
  const state = await getUserState(user);
  return (
    <html lang="en-GB" data-theme={theme} suppressHydrationWarning>
      <body className="min-h-dvh">
        <ToastProvider>
          <ConfirmProvider>
          <FxProvider value={await getFx()}>
          <UserStateProvider value={state}>
            <SiteHeader initialTheme={theme} overlay />
            <main id="main">{children}</main>
            <SiteFooter />
            <BottomNav />
          </UserStateProvider>
          </FxProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
