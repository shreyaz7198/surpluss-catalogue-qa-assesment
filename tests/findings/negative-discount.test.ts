import { describe, it, expect } from "vitest";
import { discountPercent } from "@/lib/pricing";

describe("BUG-03: Negative Discount on Inverted Prices", () => {
  it("should clamp discount percentage to 0 when offer price exceeds MRP", () => {
    const result = discountPercent({
      priceOnRequest: false,
      mrp: 100,
      offerPrice: 120,
    });

    expect(result).toBe(0);
  });
});