import { asc } from "drizzle-orm";
import { db, t } from "@/db/client";
import { getFx } from "@/services/settings";
import { SettingsAdmin } from "@/components/admin/settings-admin";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminSettings() {
  await requireAdminPage(undefined, "/admin/settings");
  const cats = db.select().from(t.budgetCategories).orderBy(asc(t.budgetCategories.sort)).all();
  return (
    <div>
      <h1 className="text-3xl">Settings</h1>
      <SettingsAdmin fx={getFx()} categories={cats} />
    </div>
  );
}
