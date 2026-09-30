import { test, expect } from "@playwright/test";

test.describe("Buyer Enquiry Journey to Admin Leads Inbox", () => {
    test.setTimeout(90000);

    test.use({
        viewport: { width: 1280, height: 800 },
    });

    test("Guest buyer browses catalogue, submits enquiry, and admin verifies it in Leads Inbox", async ({
                                                                                                            page,
                                                                                                            browser,
                                                                                                        }) => {
        const timestamp = Date.now();
        const buyerName = `QA Buyer ${timestamp}`;
        const buyerPhone = "9876543210";

        // -------------------------------------------------------------------------
        // 1. BUYER CONTEXT: Open published catalogue and browse products
        // -------------------------------------------------------------------------
        await page.goto("/catalogue/premium-corporate-essentials", {
            waitUntil: "domcontentloaded",
            timeout: 45000,
        });

        // Find and click the first product card link on the catalogue page
        const firstProductCard = page.locator("a[href*='/product/']").first();
        await expect(firstProductCard).toBeVisible({ timeout: 15000 });
        await firstProductCard.click();

        // Verify navigation to product detail page
        await expect(page).toHaveURL(/\/product\//, { timeout: 15000 });
        await page.waitForLoadState("domcontentloaded");

        // -------------------------------------------------------------------------
        // 2. Open enquiry dialog and submit details
        // -------------------------------------------------------------------------
        const contactBtn = page
            .locator("button:has-text('Contact Us'), button:has-text('Get Offer Price')")
            .locator("visible=true")
            .first();

        await expect(contactBtn).toBeVisible({ timeout: 10000 });
        await contactBtn.click();

        // Wait for the modal input field to appear directly
        const nameInput = page.locator("#contact-name");
        await expect(nameInput).toBeVisible({ timeout: 10000 });

        // Fill in buyer details
        await nameInput.fill(buyerName);
        await page.locator("#contact-phone").fill(buyerPhone);

        // Set up network response listener for /api/enquiries POST
        const enquiryResponsePromise = page.waitForResponse(
            (response) =>
                response.url().includes("/api/enquiries") && response.status() === 201,
            { timeout: 20000 }
        );

        // Click "Send enquiry"
        const sendBtn = page.getByRole("button", { name: "Send enquiry" });
        await expect(sendBtn).toBeEnabled();
        await sendBtn.click();

        // Await API response and extract reference code
        const enquiryResponse = await enquiryResponsePromise;
        const responseJson = await enquiryResponse.json();
        const generatedReference: string = responseJson.reference;
        expect(generatedReference).toBeTruthy();

        // Confirm that the dialog displays the "Enquiry sent" screen
        await expect(page.getByText("Enquiry sent")).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(generatedReference)).toBeVisible();

        // -------------------------------------------------------------------------
        // 3. ADMIN CONTEXT: Sign in and verify enquiry in Leads Inbox
        // -------------------------------------------------------------------------
        const adminContext = await browser.newContext({
            viewport: { width: 1280, height: 800 },
        });
        const adminPage = await adminContext.newPage();

        // Navigate to Admin Login
        await adminPage.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });
        await adminPage.locator("#email").fill("admin@catalogue.test");
        await adminPage.locator("#password").fill("Admin#2026");

        // Click Sign In
        await adminPage.getByRole("button", { name: "Sign in" }).click();

        // Wait for navigation into /admin
        await adminPage.waitForURL(/\/admin/, {
            waitUntil: "domcontentloaded",
            timeout: 25000,
        });

        // Go directly to the Leads Inbox page
        await adminPage.goto("/admin/leads", { waitUntil: "domcontentloaded", timeout: 30000 });

        // Verify the newly created enquiry appears in the admin table
        const leadEntry = adminPage.getByText(buyerName).first();
        await expect(leadEntry).toBeVisible({ timeout: 20000 });

        await adminContext.close();
    });
});