import { describe, expect, it } from "vitest";
import { isoDate, isoDateTime, participantList } from "@/lib/validation";
import { jsonLdScript } from "@/lib/utils";

describe("isoDate", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isoDate.safeParse("2026-12-12").success).toBe(true);
    expect(isoDate.safeParse("2028-02-29").success).toBe(true);
    expect(isoDate.safeParse("2026-02-31").success).toBe(false);
    expect(isoDate.safeParse("2026-12-99").success).toBe(false);
    expect(isoDate.safeParse("12/12/2026").success).toBe(false);
  });
  it("validates date-times", () => {
    expect(isoDateTime.safeParse("2026-12-12T15:30").success).toBe(true);
    expect(isoDateTime.safeParse("2026-12-12T24:30").success).toBe(false);
    expect(isoDateTime.safeParse("2026-02-30T10:00").success).toBe(false);
  });
});

describe("participantList", () => {
  it("removes duplicate ids", () => {
    const id = "6f1c1f9e-3a1b-4c2d-9e8f-0a1b2c3d4e5f";
    expect(participantList.parse([id, id])).toEqual([id]);
  });
});

describe("jsonLdScript", () => {
  it("cannot close the surrounding script tag", () => {
    const out = jsonLdScript({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });
});
