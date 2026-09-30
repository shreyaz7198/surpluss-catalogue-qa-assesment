import { describe, it, expect } from "vitest";
import { autoMap } from "@/lib/import-mapping";

describe("BUG-05: Substring Collision in CSV Import Auto-Mapping", () => {
  it("maps 'List Price' to MRP rather than colliding into offerPrice via 'price' substring", () => {
    const headers = ["List Price", "Selling Price"];
    const mapping = autoMap(headers);

    expect(mapping["List Price"]).toBe("mrp");
  });
});