import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    catalogue: {
      delete: vi.fn().mockResolvedValue({
        id: "d3b07384-d113-4a11-8c91-a1b2c3d4e5f6",
        slug: "test-slug",
        name: "Test Catalogue",
      }),
    },
  })),
}));

import { currentActor } from "@/auth-guards";
import { deleteCatalogue } from "@/app/admin/actions";

describe("BUG-01: Staff Authorization on Catalogue Deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (currentActor as any).mockResolvedValue({
      id: "staff-user-id",
      email: "staff@catalogue.test",
      role: "staff",
    });
  });

  it("should forbid staff from deleting a catalogue", async () => {
    const validUuid = "d3b07384-d113-4a11-8c91-a1b2c3d4e5f6";
    const result = await deleteCatalogue(validUuid);

    expect(result).toHaveProperty("error");
    expect((result as any).error).toMatch(/admin|authorized|permission|not allowed/i);
  });
});