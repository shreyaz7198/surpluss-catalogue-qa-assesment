# Findings
--------------------------------------------------------------------------------------------------------

## Bug 1. Staff can publish and delete catalogues

**What happens**

Staff accounts can publish and delete catalogues by calling the server actions directly. The actions only check that the user is logged in, not that they are an `admin`.

**Steps to reproduce**

1. Log in as a staff user (`staff@catalogue.test`).
2. Call `publishCatalogueAction(catalogueId)` or `deleteCatalogueAction(catalogueId)` directly.
3. The server runs the action and returns success (200 OK) instead of a 403 Forbidden / Unauthorized error.

**What should happen instead**

Both actions should require the `admin` role and reject `staff` users with an authorization error.

**Impact — how bad is this, and why?**

Critical (security and commercial risk). Any logged-in staff member can put unapproved pricing or confidential catalogues on the public internet, or permanently delete a catalogue and the customer lead history with it. It needs no special conditions beyond a valid staff login.

**Failing test**

`tests/findings/staff-publish-delete.test.ts` — `<test name>`

--------------------------------------------------------------------------------------------------------

## Bug 2. Draft and expired catalogues leak through the search API

**What happens**

The public search endpoint returns products from draft or expired catalogues to anyone, with no login. It never checks whether the catalogue is published and still valid.

**Steps to reproduce**

1. Without logging in, send `GET /api/catalogues/festive-overstock-2026/search?q=`.
2. The response is 200 OK with the full list of products and offer pricing.
3. The catalogue's main page route correctly blocks the same catalogue.

**What should happen instead**

The endpoint should return 404 Not Found (or 403 Forbidden) when the catalogue is in `draft` state or its `validUntil` date has passed, matching the main page route.

**Impact — how bad is this, and why?**

Critical (security and commercial leak). Confidential pre-launch inventory and negotiated customer pricing (e.g. `festive-overstock-2026`) are exposed to competitors, scrapers, and unauthorized buyers. Anyone who can guess or learn a slug can read it, and no authentication is needed.

**Failing test**

`tests/findings/draft-search-leak.test.ts` — `<test name>`

--------------------------------------------------------------------------------------------------------

## Bug 3. Enquiries ignore MOQ and available stock

**What happens**

The enquiry API accepts quantities below the product's minimum order quantity (MOQ) and above the available stock. It creates the enquiry anyway.

**Steps to reproduce**

1. Pick a product with `moq = 50` and `availableQty = 100`.
2. Send `POST /api/enquiries` with `items: [{ productId: "...", quantity: 5 }]`, then again with `quantity: 500`.
3. Both requests create an enquiry with an `ENQ-` reference and save it to the database.

**What should happen instead**

The API should check each item against the product record and return 400 Bad Request if `quantity < moq` or `quantity > availableQty`.

**Impact — how bad is this, and why?**

High (operational and commercial). Buyers can submit enquiries that can't be fulfilled, either below the manufacturer's MOQ or beyond warehouse stock. The sales team then spends time on them. It affects every public buyer and needs no special conditions.

**Failing test**

`tests/findings/enquiry-moq-validation.test.ts` — `<test name>`

--------------------------------------------------------------------------------------------------------

## Bug 4. Bulk import fails on Indian currency formats

**What happens**

The CSV/Excel importer can't read prices written with currency symbols, Indian-style commas, or unit suffixes (e.g. `₹1,20,000`, `₹ 45,000 / pc`). It rejects valid inventory rows as format errors.

**Steps to reproduce**

1. Import a sheet with a price like `₹1,20,000`.
2. The field goes through the transformation in `src/lib/import-mapping.ts`.
3. The result is `NaN` or a validation rejection instead of `120000`.

**What should happen instead**

The importer should strip currency symbols (`₹`, `$`), unit suffixes (`/pc`, `/piece`), and thousand separators (`,`), then convert the rest to a number.

**Impact — how bad is this, and why?**

Medium (operational). No money or data is exposed, but sales operations can't bulk-import typical seller inventory sheets and must clean the data by hand first. It hits anyone importing sheets with formatted prices.

**Failing test**

`tests/findings/import-currency-parsing.test.ts` — `<test name>`

--------------------------------------------------------------------------------------------------------

## Bug 5. Substring collision in CSV import auto-mapping

**What happens**

In `src/lib/import-mapping.ts`, `autoMap()` checks column headers using `normalized.includes(key)`. The `offerPrice` synonyms include the generic token `"price"`, causing headers such as `"List Price"` (`"listprice"`) to match `"price"` and bind to `offerPrice` instead of `mrp`.

**Steps to reproduce**

1. Call `autoMap(["List Price", "Selling Price"])`.
2. Inspect the returned column mapping.
3. `"List Price"` is mapped to `offerPrice` instead of `mrp`.

**What should happen instead**

Headers like `"List Price"` should map to `mrp`. Exact token matches and specific phrases should take priority over greedy substring matching.

**Impact — how bad is this, and why?**

Medium (data integrity). It corrupts bulk pricing during CSV imports by swapping or misassigning MRP and offer price values, leading to incorrect catalogue pricing.

**Failing test**

`tests/findings/bug-05-import-automap.test.ts` — `<test name>`

--------------------------------------------------------------------------------------------------------