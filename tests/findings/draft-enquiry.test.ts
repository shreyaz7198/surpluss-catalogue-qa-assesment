import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/enquiries/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/notifications", () => ({
  notifyTeam: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    catalogueListing: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "listing-1",
          productId: "11111111-1111-4111-a111-111111111111",
          product: {
            name: "Draft Item",
            sku: "SKU-DRAFT",
            brand: "Brand",
            offerPrice: 500,
            priceOnRequest: false,
            moq: 1,
            quantity: 10,
          },
        },
      ]),
    },
    catalogue: {
      findUnique: vi.fn().mockResolvedValue({
        id: "22222222-2222-4222-a222-222222222222",
        status: "draft",
        notifyNumber: null,
      }),
    },
    enquiry: {
      create: vi.fn().mockResolvedValue({ id: "enquiry-1" }),
    },
  })),
}));

describe("BUG-04: Enquiries Allowed on Draft Catalogues", () => {
  it("should reject enquiry submissions targeting a draft catalogue", async () => {
    const payload = {
      catalogueId: "22222222-2222-4222-a222-222222222222",
      name: "Test Buyer",
      email: "buyer@example.com",
      phone: "9876543210",
      items: [
        {
          productId: "11111111-1111-4111-a111-111111111111",
          quantity: 2,
        },
      ],
    };

    const req = new NextRequest("http://localhost:3001/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await POST(req);

    expect([400, 404]).toContain(response.status);
  });
});