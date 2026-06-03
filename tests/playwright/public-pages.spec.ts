import { expect, test } from "@playwright/test";

const policyRoutes = [
  { path: "/pricing", heading: /simple pricing for startup names/i },
  { path: "/terms", heading: /terms of service/i },
  { path: "/privacy", heading: /privacy policy/i },
  { path: "/refund-policy", heading: /refund policy/i },
  { path: "/contact", heading: /contact namelift/i }
];

test.describe("public payment-review pages", () => {
  for (const route of policyRoutes) {
    test(`${route.path} renders`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.goto(route.path);

      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
      await expect(page.getByText(/support@spectrallabshq\.com/i).first()).toBeVisible();
      expect(pageErrors).toEqual([]);
    });
  }

  test("pricing states the exact product offer", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.getByText(/\$0/i)).toBeVisible();
    await expect(page.getByText(/3 AI-generated startup name candidates/i)).toBeVisible();
    await expect(page.getByText(/\$5/i).first()).toBeVisible();
    await expect(page.getByText(/50 AI-generated startup name candidates for one startup\/project/i)).toBeVisible();
    await expect(page.getByText(/No subscription and no recurring charge/i)).toBeVisible();
    await expect(page.getByText(/not a subscription, agency engagement, legal service/i)).toBeVisible();
  });

  test("landing footer exposes review-required links", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    await expect(footer.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    await expect(footer.getByRole("link", { name: "Refunds" })).toHaveAttribute("href", "/refund-policy");
    await expect(footer.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  });
});
