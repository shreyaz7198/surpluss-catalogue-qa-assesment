import { describe, it, expect } from "vitest";
import { effectiveStatus } from "@/lib/catalogue-status";

describe("Catalogue Status Normalization Unit Tests", () => {
  it("normalizes legacy 'inactive' status to 'draft'", () => {
    expect(effectiveStatus("inactive", null)).toBe("draft");
  });

  it("normalizes database 'expired' status without date to 'draft'", () => {
    expect(effectiveStatus("expired", null)).toBe("draft");
  });

  it("retains 'draft' status regardless of expiresAt value", () => {
    const future = new Date(Date.now() + 100000);
    const past = new Date(Date.now() - 100000);

    expect(effectiveStatus("draft", null)).toBe("draft");
    expect(effectiveStatus("draft", future)).toBe("draft");
    expect(effectiveStatus("draft", past)).toBe("draft");
  });

  it("keeps published catalogue with null expiresAt as 'published'", () => {
    expect(effectiveStatus("published", null)).toBe("published");
  });
});