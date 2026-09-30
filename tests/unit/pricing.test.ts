import { describe, it, expect } from "vitest";
import {
  discountPercent,
  priceLabel,
  needsPricesForSale,
  PRICE_ON_REQUEST_LABEL,
  NO_PRICE_LABEL,
} from "@/lib/pricing";

describe("Pricing Utilities Unit Tests", () => {
  const format = (v: number) => `₹${v.toLocaleString("en-IN")}`;

  describe("discountPercent", () => {
    it("returns 0 when priceOnRequest is true", () => {
      expect(
        discountPercent({ priceOnRequest: true, mrp: 1000, offerPrice: 500 })
      ).toBe(0);
    });

    it("returns 0 if either mrp or offerPrice is null or 0", () => {
      expect(
        discountPercent({ priceOnRequest: false, mrp: null, offerPrice: 500 })
      ).toBe(0);
      expect(
        discountPercent({ priceOnRequest: false, mrp: 1000, offerPrice: null })
      ).toBe(0);
      expect(
        discountPercent({ priceOnRequest: false, mrp: 0, offerPrice: 500 })
      ).toBe(0);
    });

    it("returns 0 if values are not finite numbers", () => {
      expect(
        discountPercent({
          priceOnRequest: false,
          mrp: Infinity,
          offerPrice: 500,
        })
      ).toBe(0);
      expect(
        discountPercent({ priceOnRequest: false, mrp: 1000, offerPrice: NaN })
      ).toBe(0);
    });

    it("correctly calculates standard round discount percentages", () => {
      // 50% discount
      expect(
        discountPercent({ priceOnRequest: false, mrp: 1000, offerPrice: 500 })
      ).toBe(50);

      // 33.33% rounded to 33%
      expect(
        discountPercent({ priceOnRequest: false, mrp: 300, offerPrice: 200 })
      ).toBe(33);

      // 0% discount when offerPrice equals mrp
      expect(
        discountPercent({ priceOnRequest: false, mrp: 500, offerPrice: 500 })
      ).toBe(0);
    });
  });

  describe("priceLabel", () => {
    it("returns 'Price on Request' when priceOnRequest is true", () => {
      expect(
        priceLabel({ priceOnRequest: true, offerPrice: 500 }, format)
      ).toBe(PRICE_ON_REQUEST_LABEL);
    });

    it("returns formatted price when offerPrice is valid", () => {
      expect(
        priceLabel({ priceOnRequest: false, offerPrice: 2499 }, format)
      ).toBe("₹2,499");
    });

    it("returns 'Price on enquiry' when offerPrice is null and not priceOnRequest", () => {
      expect(
        priceLabel({ priceOnRequest: false, offerPrice: null }, format)
      ).toBe(NO_PRICE_LABEL);
    });
  });

  describe("needsPricesForSale", () => {
    it("returns false if priceOnRequest is enabled", () => {
      expect(
        needsPricesForSale({
          priceOnRequest: true,
          mrp: null,
          offerPrice: null,
        })
      ).toBe(false);
    });

    it("returns true if either mrp or offerPrice is null", () => {
      expect(
        needsPricesForSale({
          priceOnRequest: false,
          mrp: 100,
          offerPrice: null,
        })
      ).toBe(true);
      expect(
        needsPricesForSale({
          priceOnRequest: false,
          mrp: null,
          offerPrice: 80,
        })
      ).toBe(true);
    });

    it("returns false if both mrp and offerPrice are provided", () => {
      expect(
        needsPricesForSale({ priceOnRequest: false, mrp: 100, offerPrice: 80 })
      ).toBe(false);
    });
  });
});