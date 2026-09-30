import { describe, it, expect } from "vitest";
import { parseNumber, validateRows, autoMap } from "@/lib/import-mapping";

describe("Import Mapping & Validation Unit Tests", () => {
  describe("parseNumber", () => {
    it("returns null for undefined or empty input", () => {
      expect(parseNumber(undefined)).toBeNull();
      expect(parseNumber("")).toBeNull();
      expect(parseNumber("   ")).toBeNull();
    });

    it("parses clean numeric strings and integers", () => {
      expect(parseNumber("500")).toBe(500);
      expect(parseNumber("0")).toBe(0);
      expect(parseNumber("12.50")).toBe(12.5);
    });

    it("cleans standard currency prefixes and commas", () => {
      expect(parseNumber("₹5,999")).toBe(5999);
      expect(parseNumber("$1,200")).toBe(1200);
      expect(parseNumber("€ 450")).toBe(450);
    });
  });

  describe("autoMap", () => {
    it("maps exact standard header synonyms", () => {
      const headers = ["SKU", "Product Name", "Brand", "Available Quantity"];
      const mapping = autoMap(headers);

      expect(mapping["SKU"]).toBe("sku");
      expect(mapping["Product Name"]).toBe("name");
      expect(mapping["Brand"]).toBe("brand");
      expect(mapping["Available Quantity"]).toBe("quantity");
    });

    it("assigns unrecognized columns as custom attributes", () => {
      const headers = ["SKU", "Custom Color", "Warehouse Bin"];
      const mapping = autoMap(headers);

      expect(mapping["SKU"]).toBe("sku");
      expect(mapping["Custom Color"]).toBe("attribute");
      expect(mapping["Warehouse Bin"]).toBe("attribute");
    });
  });

  describe("validateRows", () => {
    const defaultMapping = {
      SKU: "sku" as const,
      Name: "name" as const,
      Quantity: "quantity" as const,
      MRP: "mrp" as const,
      OfferPrice: "offerPrice" as const,
      Image: "imageUrl" as const,
    };

    it("rejects rows with missing SKU as blocking issues", () => {
      const file = {
        name: "test.csv",
        sizeKB: 1,
        headers: ["SKU", "Name", "Quantity"],
        rows: [{ SKU: "", Name: "Item 1", Quantity: "10" }],
      };

      const result = validateRows(file, defaultMapping);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].blocking).toBe(true);
      expect(result.issues[0].message).toContain("SKU is missing");
      expect(result.rows).toHaveLength(0);
    });

    it("rejects rows with duplicate SKUs in the same file", () => {
      const file = {
        name: "test.csv",
        sizeKB: 1,
        headers: ["SKU", "Name", "Quantity"],
        rows: [
          { SKU: "SKU-001", Name: "Item 1", Quantity: "10" },
          { SKU: "SKU-001", Name: "Item 2", Quantity: "5" },
        ],
      };

      const result = validateRows(file, defaultMapping);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].blocking).toBe(true);
      expect(result.issues[0].message).toContain("appears more than once");
      expect(result.rows).toHaveLength(1); // Only the first row is imported
    });

    it("rejects rows with non-integer or negative quantity", () => {
      const file = {
        name: "test.csv",
        sizeKB: 1,
        headers: ["SKU", "Name", "Quantity"],
        rows: [
          { SKU: "SKU-A", Name: "Item A", Quantity: "-5" },
          { SKU: "SKU-B", Name: "Item B", Quantity: "10.5" },
        ],
      };

      const result = validateRows(file, defaultMapping);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].blocking).toBe(true);
      expect(result.issues[1].blocking).toBe(true);
    });

    it("flags non-https image URLs as non-blocking warnings", () => {
      const file = {
        name: "test.csv",
        sizeKB: 1,
        headers: ["SKU", "Name", "Quantity", "Image"],
        rows: [
          {
            SKU: "SKU-IMG",
            Name: "Valid Item",
            Quantity: "20",
            Image: "http://insecure.com/pic.jpg",
          },
        ],
      };

      const result = validateRows(file, defaultMapping);
      expect(result.warnings).toBe(1);
      expect(result.issues[0].blocking).toBe(false);
      expect(result.rows[0].imageUrl).toBeUndefined(); // Insecure URL is safely omitted
    });

    it("increments missingPrices counter when MRP or Offer Price is missing", () => {
      const file = {
        name: "test.csv",
        sizeKB: 1,
        headers: ["SKU", "Name", "Quantity", "MRP", "OfferPrice"],
        rows: [
          {
            SKU: "SKU-NOPRICE",
            Name: "No Price Item",
            Quantity: "15",
            MRP: "",
            OfferPrice: "",
          },
        ],
      };

      const result = validateRows(file, defaultMapping);
      expect(result.missingPrices).toBe(1);
      expect(result.rows[0].mrp).toBeUndefined();
      expect(result.rows[0].offerPrice).toBeUndefined();
    });
  });
});