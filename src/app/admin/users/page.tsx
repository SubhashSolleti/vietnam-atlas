import { desc } from "drizzle-orm";
import { db, t } from "@/db/client";
import { requireAdminPage } from "@/lib/auth";
import { UsersAdmin } from "@/components/admin/users-admin";

export default async function AdminUsers() {
  await requireAdminPage(["super_admin"], "/admin/users");
  const users = await db.select().from(t.users).orderBy(desc(t.users.createdAt)).all();
  return (
    <div>
      <h1 className="text-3xl">Users</h1>
      <p className="mt-2 text-sm text-muted">Guests are anonymous browser profiles. Trip membership and trip contents are private and not shown here.</p>
      <UsersAdmin users={users.map((u) => ({ id: u.id, name: u.displayName, email: u.email, role: u.role, isGuest: u.isGuest, disabled: !!u.disabledAt, createdAt: u.createdAt }))} />
    </div>
  );
}
