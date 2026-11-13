import { expect, test } from "@playwright/test";

test.describe("security regressions", () => {
  test("admin pages never return data to anonymous RSC requests", async ({ request }) => {
    for (const path of ["/admin", "/admin/feedback", "/admin/audit", "/admin/settings", "/admin/users"]) {
      const res = await request.get(path, { headers: { RSC: "1" }, maxRedirects: 0 });
      const body = await res.text();
      // Either a redirect to login or an empty/not-found payload. Never admin content.
      expect([200, 307, 308, 404], path).toContain(res.status());
      expect(body, path).not.toMatch(/Feedback & reviews|Audit log|Exchange rate|super_admin/);
    }
  });

  test("responses carry security headers", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("malformed links are rejected with 400, not a server error", async ({ request }) => {
    for (const path of ["/join/%E0%A4%A", "/destinations/%E0%A4%A"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(400);
    }
    expect((await request.get("/join/NOSUCHCODE")).status()).toBe(404);
  });

  test("search API clamps the result limit", async ({ request }) => {
    const res = await request.get("/api/search?q=a&limit=-1");
    expect(res.ok()).toBe(true);
    const data = await res.json();
    const hits = Array.isArray(data) ? data : (data.hits ?? data.results ?? []);
    expect(hits.length).toBeLessThanOrEqual(50);
  });
});
