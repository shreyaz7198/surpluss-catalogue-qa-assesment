# Write-up

Bullet points are fine. We are not marking your English.

---

## 1. Strategy

I started at the core business logic and worked outward to the server boundary, because the cost of a bug rises the closer it gets to money or data exposure.

1. **Pricing (unit):** `src/lib/pricing.ts`. Rounding or arithmetic errors show buyers wrong prices or negative discount badges, which damages trust.
2. **Import mapping (unit):** `src/lib/import-mapping.ts`. Loose substring matching can swap columns (e.g. MRP vs. Offer Price) during bulk imports, silently corrupting inventory data.
3. **Catalogue status (unit):** `src/lib/catalogue-status.ts`. Status mapping (`draft`, `published`, legacy `inactive`) must behave predictably so active stock isn't hidden and drafts aren't exposed.
4. **Authorization and status transitions (integration):** `src/app/api/admin/` and `src/app/admin/actions.ts`. Checks that `staff` vs. `admin` and signed-out access are enforced on the server, not just by hiding UI buttons.
5. **Public enquiry API (integration):** `src/app/api/enquiries/`. Covers Zod validation (phone/email, UUIDs, positive integer quantities) and that products from another catalogue are rejected.
6. **Buyer journey (Playwright E2E):** one smoke test of the full enquiry funnel, so lead generation can't silently break between releases.

---

## 2. The riskiest part of this product

**Server-side role and state enforcement (publishing, deleting, status changes).**

If nobody tested it:

- Role checks that exist only in the UI (hidden buttons) can be bypassed by calling the server action or API directly.
- A `staff` user could permanently delete a live catalogue and its customer lead history.
- A `staff` user could publish unapproved supplier quotes, draft rates, or confidential overstock deals to the public internet. That could create commitments to unprofitable prices or stock we don't have.

I'd protect this first because the damage is hard to undo (deleted data, leaked pricing) and hits the business directly.

---

## 3. What I left out, and why

- **Visual styling and layout:** Tailwind classes, breakpoints, icons, and animations change often. Snapshot tests would add maintenance cost without catching functional bugs.
- **Analytics calls (`trackEvent`, `trackEcommerce`):** Mocking telemetry everywhere adds boilerplate and protects nothing users or sales depend on.
- **Real database tests:** Prisma is mocked at the service boundary so the suite stays fast and deterministic. The trade-off is that schema or query bugs won't be caught. A few tests against a real Postgres container would be my next step.
- **WhatsApp web:** I checked that the generated `waHref` URL is well formed, but didn't navigate to `web.whatsapp.com`. It's a third-party site outside our control and would make the test flaky.
- **Cross-browser matrix:** E2E runs on Chromium only, for fast and stable feedback. WebKit and Firefox can be added later.

---

## 4. AI tool usage

**Tools:** Gemini and VS Code with AI extensions. `[FILL IN: add Claude or any other tool you actually used]`

**What I used them for:**

- Reading `src/app/api/enquiries/route.ts` and `src/app/admin/actions.ts` to map validation boundaries and spot missing role checks.
- Drafting first versions of the Vitest suites and the Playwright journey.

**What I changed about what they produced:**

- **Wrong names:** The AI invented `publishCatalogueAction` and `parsePriceField`. I replaced them with the real exports (`setCatalogueStatus`, `deleteCatalogue`, `parseNumber`).
- **Next.js route signature:** Tests for `/api/admin/catalogues/[id]` were missing the `{ params: Promise<{ id: string }> }` argument that Next.js 15+ handlers expect.
- **Unmocked `after()`:** Integration tests threw 500s because `after` from `next/server` wasn't mocked. I mocked it and the team notification call.
- **Shared session state:** The AI wrote one sequential script. I split it into two isolated browser contexts (guest buyer and admin) so cookies and storage can't leak between them.
- **Fragile selectors and timing:** I replaced text matching with stable IDs (`#contact-name`, `#contact-phone`, `#email`, `#password`) and added `page.waitForResponse` on `POST /api/enquiries` to capture the `ENQ-XXXXXXX` reference.

---

## 5. One thing this codebase gets wrong

**Authorization is checked by hand in each handler, and inconsistently.**

- Admin route handlers and server actions each call `currentActor()` and then decide on their own whether to check the role.
- `setCatalogueStatus` checks `isAdmin(actor)`, but `deleteCatalogue` only checks `!actor`. Any signed-in staff user can delete a catalogue.
- UI components such as `CatalogueDetailPage` hide buttons with `canManage={isAdmin(actor)}`, so the UI looks stricter than the API really is.

**What I would change:** Put authorization in one wrapper that every admin mutation must go through, so a missing check becomes hard to write by accident:

```typescript
export const deleteCatalogue = adminAction(
  z.object({ catalogueId: z.string().uuid() }),
  async ({ catalogueId }, { actor }) => {
    // actor is guaranteed to be signed in and an admin
    return getPrisma().catalogue.delete({ where: { id: catalogueId } });
  }
);
```

A library like `next-safe-action` or a small in-house higher-order function would both work.

---

## Notes

### E2E test (Task 4)

- **Waiting for state:** I wait on conditions, not fixed timeouts. The test waits for the `POST /api/enquiries` response, reads the `ENQ-` reference from it, then asserts that reference is visible in the UI.
- **Test data:** `[FILL IN: how you seeded the published catalogue, products, and admin user, and how you avoid collisions or clean up]`
- **Stable selectors:** I use element IDs and roles, not loose text. `ProductCtaRow` renders twice (desktop `hidden sm:block`, mobile `sm:hidden`), so I fixed the viewport at 1280x800 and scoped queries with `locator("visible=true")`.
- **If this ran on every PR:**
  - Start the app and seed the database in CI instead of relying on a dev server already running.
  - Use a dedicated test database that is reset per run.
  - Enable Playwright retries, plus traces and screenshots on failure.
  - Run it in parallel with the Vitest suites to keep feedback fast.

### Setup and assumptions

- **Playwright and the dev server:** With `npm run dev` already running on port 3001, Playwright's `webServer` tried to start a second instance. Setting `PLAYWRIGHT_SKIP_WEBSERVER=1` fixed the port conflict and timeouts.
- **Planted bugs left unpatched:** As the assessment requires, I did not fix bugs in `src/`, so the tests in `tests/findings/` keep failing and document the problems.