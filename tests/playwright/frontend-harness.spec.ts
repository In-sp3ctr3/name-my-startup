import { expect, test, type Page } from "@playwright/test";

async function resetDemoState(page: Page) {
  await page.request.post("/api/dev/reset").catch(() => null);
  await page.goto("/start");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

test.describe("Namelift internal flow", () => {
  test("unauthenticated start keeps history hidden and logo returns to landing", async ({ page }) => {
    await resetDemoState(page);

    await expect(page.getByRole("heading", { name: /let's name something unforgettable/i })).toBeVisible();
    await expect(page.getByLabel(/open history menu/i)).toHaveCount(0);
    await page.getByRole("button", { name: /namelift home/i }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/login");
    await page.getByRole("button", { name: /namelift home/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("free sprint gates into login, checkout, success, and the 50-name pack", async ({ page }) => {
    await resetDemoState(page);

    await expect(page.getByRole("heading", { name: /let's name something unforgettable/i })).toBeVisible();
    await page.getByRole("textbox", { name: /the brief/i }).fill("A calm budgeting app for freelancers");
    await page.getByRole("button", { name: /playful/i }).click();
    await page.getByRole("button", { name: /generate 3 free names/i }).click();

    await expect(page.getByRole("heading", { name: /naming in progress/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /3 names, fully checked/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("evidence-run-status").getByText(/backend evidence loaded/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("locked-teaser")).toBeVisible();
    await expect(page.getByTestId("locked-teaser")).toHaveCSS("filter", /blur\(5\.5px\)/);
    await expect(page.getByTestId("locked-teaser").locator("[data-teaser-kind='visual-decoy']")).toHaveCount(4);
    await expect(page.getByTestId("locked-teaser").getByText("Asterlane")).toBeVisible();
    await expect(page.getByText("Northwind")).toHaveCount(0);
    await expect(page.getByText("Kindle Labs")).toHaveCount(0);
    await page.getByRole("button", { name: /^save /i }).first().click();
    await page.getByRole("button", { name: /sign in to unlock - \$5/i }).click();

    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByText(/next: \$5 one-time - 50 names/i)).toBeVisible();
    await page.getByRole("button", { name: /^log in/i }).click();

    await expect(page.getByRole("heading", { name: /unlock your launch pack/i })).toBeVisible();
    await page.getByRole("button", { name: /pay \$5 & unlock/i }).click();
    await expect(page.getByRole("heading", { name: /all set/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /view all 50 names/i }).click();

    await expect(page.getByLabel(/search paid names/i)).toBeVisible();
    await expect(page.getByText(/showing 1-12 of 50 names/i)).toBeVisible();
    await page.getByRole("button", { name: /show 12 more/i }).click();
    await expect(page.getByText(/showing 1-24 of 50 names/i)).toBeVisible();
    await expect(page.getByTestId("evidence-run-status").getByText(/backend evidence loaded/i)).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /^show report for /i }).first().click();
    await expect(page.getByText(/provider evidence/i)).toBeVisible();
    await expect(page.getByText(/persisted provider results/i)).toBeVisible();
    await page.getByRole("button", { name: /^copy /i }).first().click();
    await expect(page.locator("[aria-live='polite']").getByText(/^copied .+\.com/i)).toBeVisible();
    await page.getByRole("button", { name: /export report/i }).click();
    await expect(page.getByRole("heading", { name: /export report/i })).toBeVisible();
    await expect(page.getByText(/backend report ready/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/checked recommendations/i)).toBeVisible();
  });

  test("authenticated app routes expose projects, billing, and settings", async ({ page }) => {
    await resetDemoState(page);
    await page.goto("/login");
    await page.getByRole("button", { name: /^log in/i }).click();

    await expect(page.getByRole("heading", { name: /your projects/i })).toBeVisible();
    await page.getByLabel(/search projects/i).fill("missing");
    await expect(page.getByText(/no matching projects/i)).toBeVisible();

    await page.goto("/app/billing");
    await expect(page.getByRole("heading", { name: /billing/i })).toBeVisible();
    await expect(page.getByText(/not a credit balance/i)).toBeVisible();
    await expect(page.getByText("Pack history", { exact: true })).toBeVisible();
    await expect(page.getByText(/no pack history yet/i)).toBeVisible();
    await expect(page.getByText(/names remaining/i)).toHaveCount(0);
    await page.getByRole("button", { name: /start another startup/i }).click();
    await expect(page.getByRole("heading", { name: /unlock this startup/i })).toBeVisible();

    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
    await page.getByRole("button", { name: /preferences/i }).click();
    await expect(page.getByText(/preferences settings are coming soon/i)).toBeVisible();
  });

  test("backend account state clears stale localStorage data", async ({ page }) => {
    await resetDemoState(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "namelift:internal-flow:v3",
        JSON.stringify({
          authed: true,
          freeUsed: true,
          currentProjectId: "stale-project",
          projects: [
            {
              id: "stale-project",
              title: "Stale Storage Startup",
              brief: "This project only exists in localStorage.",
              count: 50,
              status: "unlocked",
              when: "Yesterday",
              tileColor: "--tile-blue",
              iconKey: "bolt"
            }
          ],
          saved: ["stale-candidate"],
          candidatesByProject: {
            "stale-project": [
              {
                id: "stale-candidate",
                name: "StaleName",
                tagline: "Only stored in localStorage.",
                score: 99,
                style: "Modern",
                slug: "stalename",
                tileColor: "--tile-blue",
                report: {
                  domains: { com: true, net: true, io: true },
                  socials: { x: true, instagram: true, tiktok: true, linkedin: true, youtube: true },
                  trademark: "clear"
                }
              }
            ]
          },
          billingHistory: [
            {
              id: "stale-billing",
              title: "Stale Launch Pack",
              description: "Stale Storage Startup",
              names: 50,
              price: "$5.00",
              when: "Yesterday",
              status: "unlocked",
              createdAt: new Date().toISOString()
            }
          ],
          billingTotal: 1,
          currentPack: {
            projectId: "stale-project",
            projectName: "Stale Storage Startup",
            names: 50,
            price: "$5.00",
            status: "unlocked"
          }
        })
      );
    });

    await page.goto("/app");
    await expect(page.getByRole("heading", { name: /your projects/i })).toBeVisible();
    await expect(page.getByText("Stale Storage Startup")).toHaveCount(0);
    await expect(page.getByText("StaleName")).toHaveCount(0);

    await page.goto("/app/saved");
    await expect(page.getByText(/no saved names yet/i)).toBeVisible();
    await expect(page.getByText("StaleName")).toHaveCount(0);

    await page.goto("/app/billing");
    await expect(page.getByText(/no pack yet/i)).toBeVisible();
    await expect(page.getByText(/no pack history yet/i)).toBeVisible();
    await expect(page.getByText("Stale Launch Pack")).toHaveCount(0);
  });

  test("billing history can expand and collapse", async ({ page }) => {
    await resetDemoState(page);
    const brief = (title: string) => ({
      thing: title,
      description: `${title} backend seeded billing history`,
      audience: "founders",
      category: "startup tool",
      geography: "United States",
      tone: "modern",
      requiredWords: [],
      forbiddenWords: [],
      competitors: [],
      tlds: [".com"],
      lanes: ["descriptive"],
      sensitivity: "standard"
    });
    await page.request.post("/api/projects", {
      headers: { "x-namelift-demo-auth": "true" },
      data: { brief: brief("Startup 6"), accessType: "free_preview" }
    });
    for (let index = 1; index <= 5; index += 1) {
      const created = await page.request.post("/api/projects", { data: { brief: brief(`Startup ${index}`), accessType: "paid_pack" } });
      const body = (await created.json()) as { project: { id: string } };
      await page.request.post("/api/dev/entitlements/grant-pack", { data: { projectId: body.project.id } });
    }
    await page.goto("/login");
    await page.getByRole("button", { name: /^log in/i }).click();

    await page.goto("/app/billing");
    await expect(page.getByText(/showing 5 of 6/i)).toBeVisible();
    await expect(page.getByText("Startup 6")).toHaveCount(0);
    await page.getByRole("button", { name: /load .*more/i }).click();
    await expect(page.getByText("Startup 6")).toBeVisible();
    await page.getByRole("button", { name: /show less/i }).click();
    await expect(page.getByText("Startup 6")).toHaveCount(0);
  });
});
