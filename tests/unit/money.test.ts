import { describe, expect, it } from "vitest";
import { formatInr, formatVnd, vndToInr } from "@/lib/money";

describe("money formatting", () => {
  it("formats compact VND without dropping integer zeros", () => {
    expect(formatVnd(40_000, { compact: true })).toBe("40k ₫");
    expect(formatVnd(100_000, { compact: true })).toBe("100k ₫");
    expect(formatVnd(999_600, { compact: true })).toBe("1M ₫");
    expect(formatVnd(1_250_000, { compact: true })).toBe("1.25M ₫");
    expect(formatVnd(30_000, { compact: true })).toBe("30k ₫");
    expect(formatVnd(1_200_000, { compact: true })).toBe("1.2M ₫");
    expect(formatVnd(2_000_000, { compact: true })).toBe("2M ₫");
    expect(formatVnd(1_250_000, { compact: true })).toBe("1.25M ₫");
    expect(formatVnd(10_000_000, { compact: true })).toBe("10M ₫");
  });
  it("formats full VND and INR with Indian grouping", () => {
    expect(formatVnd(1_250_000)).toBe("1,250,000 ₫");
    expect(formatInr(248_000)).toBe("₹2,48,000");
    expect(formatInr(vndToInr(600_000, { inrToVnd: 300 }))).toBe("₹2,000");
    expect(formatInr(-13_680)).toBe("−₹13,680");
  });
});
