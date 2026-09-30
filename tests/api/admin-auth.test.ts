import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/auth-guards", () => ({
  currentActor: vi.fn(),
  isAdmin: vi.fn((actor: any) => actor?.role === "admin"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock findIncompleteProducts so publishing succeeds for admin
vi.mock("@/lib/incomplete", () => ({
  findIncompleteProducts: vi.fn().mockResolvedValue([]),
  incompleteMessage: vi.fn().mockReturnValue("Incomplete products"),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    catalogue: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: "cat-1", slug: "test", name: "Test" }),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  })),
}));

import { auth } from "@/auth";
import { currentActor } from "@/auth-guards";
import { GET as getAdminCatalogueDropdowns } from "@/app/api/admin/catalogues/[id]/route";
import { setCatalogueStatus } from "@/app/admin/actions";
import { updateCatalogueBanners } from "@/app/admin/catalogues/actions";

describe("Task 3: Admin API and Access Control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Unauthenticated (Signed-Out) Restrictions", () => {
    it("rejects signed-out callers on admin route handler with 401 Unauthorized", async () => {
      (auth as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3001/api/admin/catalogues/dummy-id?kind=catalogue");
      const res = await getAdminCatalogueDropdowns(req, {
        params: Promise.resolve({ id: "dummy-id" }),
      } as any);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/unauthorized/i);
    });

    it("rejects signed-out callers on server actions", async () => {
      (currentActor as any).mockResolvedValue(null);
      (auth as any).mockResolvedValue(null);

      const resStatus = await setCatalogueStatus("11111111-1111-4111-a111-111111111111", "published");
      expect(resStatus).toEqual({ error: "You need to sign in again." });

      const resBanners = await updateCatalogueBanners("11111111-1111-4111-a111-111111111111", []);
      expect(resBanners).toEqual({ error: "You need to sign in again." });
    });
  });

  describe("Role Enforcement: Admin vs Staff", () => {
    it("permits admin role to change catalogue status", async () => {
      (currentActor as any).mockResolvedValue({
        id: "admin-1",
        email: "admin@catalogue.test",
        role: "admin",
      });

      const res = await setCatalogueStatus("11111111-1111-4111-a111-111111111111", "published");
      expect(res).toEqual({ ok: true, name: "Test" });
    });

    it("forbids staff role from changing catalogue status to published", async () => {
      (currentActor as any).mockResolvedValue({
        id: "staff-1",
        email: "staff@catalogue.test",
        role: "staff",
      });

      const res = await setCatalogueStatus("11111111-1111-4111-a111-111111111111", "published");
      expect(res).toEqual({ error: "Only an admin can change what is published." });
    });
  });

  describe("Tampered and Malformed Payloads", () => {
    it("rejects non-UUID catalogueId with error response", async () => {
      (currentActor as any).mockResolvedValue({
        id: "admin-1",
        email: "admin@catalogue.test",
        role: "admin",
      });

      const res = await setCatalogueStatus("invalid-not-a-uuid", "published");
      expect(res).toEqual({ error: "Invalid request." });
    });

    it("rejects tampered status outside draft/published enum", async () => {
      (currentActor as any).mockResolvedValue({
        id: "admin-1",
        email: "admin@catalogue.test",
        role: "admin",
      });

      // @ts-expect-error Testing invalid runtime string
      const res = await setCatalogueStatus("11111111-1111-4111-a111-111111111111", "malicious_status");
      expect(res).toEqual({ error: "Invalid request." });
    });
  });
});