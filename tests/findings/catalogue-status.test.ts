import { describe, it, expect } from "vitest";
import { effectiveStatus } from "@/lib/catalogue-status";

describe("BUG-02: Inverted Expiry Date Lifecycle", () => {
  it("should keep a published catalogue published when its expiry date is in the future", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const status = effectiveStatus("published", tomorrow);

    // Expected: Catalogue is valid until tomorrow, so status should be "published"
    // Planted Bug: `expiresAt > new Date()` returns "expired" for future dates!
    expect(status).toBe("published");
  });

  it("should mark a published catalogue as expired when its expiry date is in the past", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const status = effectiveStatus("published", yesterday);

    // Expected: Catalogue validity lapsed, so status should be "expired"
    // Planted Bug: Falls through and returns "published" for past dates!
    expect(status).toBe("expired");
  });
});