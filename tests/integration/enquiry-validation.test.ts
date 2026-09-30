import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/enquiries/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/notifications", () => ({
  notifyTeam: vi.fn(),
}));

describe("Enquiry Schema & Payload Validation Integration Tests", () => {
  const validUuid = "11111111-1111-4111-a111-111111111111";

  it("rejects request missing both phone and email with 400 Bad Request", async () => {
    const payload = {
      catalogueId: validUuid,
      name: "Buyer Name",
      phone: "",
      email: "",
      items: [{ productId: validUuid, quantity: 1 }],
    };

    const req = new NextRequest("http://localhost:3001/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Please check the enquiry details.");
  });

  it("rejects non-UUID catalogueId with 400 Bad Request", async () => {
    const payload = {
      catalogueId: "invalid-not-a-uuid",
      name: "Buyer Name",
      email: "buyer@example.com",
      items: [{ productId: validUuid, quantity: 1 }],
    };

    const req = new NextRequest("http://localhost:3001/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects empty items array with 400 Bad Request", async () => {
    const payload = {
      catalogueId: validUuid,
      name: "Buyer Name",
      email: "buyer@example.com",
      items: [], // Schema requires minimum 1 item
    };

    const req = new NextRequest("http://localhost:3001/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects non-positive and decimal item quantities with 400 Bad Request", async () => {
    const payload = {
      catalogueId: validUuid,
      name: "Buyer Name",
      email: "buyer@example.com",
      items: [{ productId: validUuid, quantity: -2 }],
    };

    const req = new NextRequest("http://localhost:3001/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});