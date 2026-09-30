import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock next/server 'after' callback to prevent Next.js background task errors in Vitest
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((fn: () => any) => {
      try {
        fn();
      } catch {
        // ignore background task errors in tests
      }
    }),
  };
});

vi.mock("@/lib/notifications", () => ({
  notifyTeam: vi.fn().mockResolvedValue(undefined),
}));

const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    catalogueListing: {
      findMany: mockFindMany,
    },
    catalogue: {
      findUnique: mockFindUnique,
    },
    enquiry: {
      create: mockCreate,
    },
  })),
}));

import { POST as submitEnquiry } from "@/app/api/enquiries/route";

describe("Task 3: Public Catalogue & Enquiry Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 409 Conflict when requested product IDs do not belong to the target catalogue", async () => {
    const catalogueId = "11111111-1111-4111-a111-111111111111";
    const foreignProductId = "99999999-9999-4999-a999-999999999999";

    // Returns empty because the product does not belong to this catalogue
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue({ notifyNumber: null });

    const payload = {
      catalogueId,
      name: "Buyer Person",
      email: "buyer@test.com",
      items: [{ productId: foreignProductId, quantity: 1 }],
    };

    const req = new NextRequest("http://localhost:3001/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await submitEnquiry(req);
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.error).toBe("One or more products are unavailable.");
  });

  it("returns 400 Bad Request when requested quantity violates product bounds", async () => {
    const catalogueId = "11111111-1111-4111-a111-111111111111";
    const productId = "22222222-2222-4222-a222-222222222222";

    mockFindMany.mockResolvedValue([
      {
        id: "listing-1",
        productId,
        product: {
          name: "Item",
          sku: "SKU-1",
          moq: 10,
          quantity: 100,
          offerPrice: 200,
          priceOnRequest: false,
        },
      },
    ]);
    mockFindUnique.mockResolvedValue({ notifyNumber: null });

    // Payload below MOQ of 10
    const payload = {
      catalogueId,
      name: "Buyer Person",
      phone: "9876543210",
      items: [{ productId, quantity: 5 }],
    };

    const req = new NextRequest("http://localhost:3001/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await submitEnquiry(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe("A requested quantity is outside the allowed range.");
  });
});