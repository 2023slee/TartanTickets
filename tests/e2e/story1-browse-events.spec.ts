// Story 1: Browse events (end-to-end, in a real browser)
// Story 1 / AC1: list upcoming events with the date, location, price, and seats remaining.
// Story 1 / AC2: WHILE an event is sold out, show "Join waitlist" instead of "Buy".
// UX spec: every screen has empty, loading, error, and success states; keyboard usable.
import { expect, test, type Page } from "@playwright/test";

const eventCard = (page: Page, title: string) =>
  page.getByRole("article").filter({ has: page.getByRole("heading", { name: title }) });

test.describe("Story 1 / AC1: upcoming events list", () => {
  test("Story 1 / AC1: each event shows its date, location, price, and seats remaining", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Upcoming events" })).toBeVisible();

    const musical = eventCard(page, "Fall Musical: Into the Woods");
    await expect(musical).toBeVisible();
    await expect(musical.getByTestId("event-date")).toHaveText(/\w{3}, \w{3} \d{1,2} · \d{1,2}:\d{2} (AM|PM)/);
    await expect(musical.getByTestId("event-location")).toHaveText("Purnell Center, Philip Chosky Theater");
    await expect(musical.getByTestId("event-price")).toHaveText("$12.00");
    await expect(musical.getByTestId("event-seats")).toHaveText("83 seats left");

    const freeEvent = eventCard(page, "Carnival Booth Build Night");
    await expect(freeEvent.getByTestId("event-price")).toHaveText("Free");
  });

  test("Story 1 / AC1: past and cancelled events are not listed", async ({ page }) => {
    await page.goto("/");
    await expect(eventCard(page, "Fall Musical: Into the Woods")).toBeVisible();
    await expect(page.getByText("Welcome Back Mixer")).toHaveCount(0);
    await expect(page.getByText("Midnight Movie Marathon")).toHaveCount(0);
  });

  test("Story 1 / AC1: events are listed soonest first", async ({ page }) => {
    await page.goto("/");
    const titles = page.getByRole("article").getByRole("heading");
    await expect(titles).toHaveText([
      "Carnival Booth Build Night",
      "Fall Musical: Into the Woods",
      "Robotics Club Demo Day",
      "Jazz Ensemble Fall Concert",
    ]);
  });
});

test.describe("Story 1 / AC2: sold-out events", () => {
  test('Story 1 / AC2: a sold-out event shows "Join waitlist" and no "Buy" button', async ({
    page,
  }) => {
    await page.goto("/");
    const soldOut = eventCard(page, "Robotics Club Demo Day");
    await expect(soldOut.getByTestId("event-seats")).toHaveText("Sold out");
    await expect(soldOut.getByRole("button", { name: "Join waitlist" })).toBeVisible();
    await expect(soldOut.getByRole("button", { name: "Buy" })).toHaveCount(0);
  });

  test('Story 1 / AC2: an event with seats shows "Buy" and no "Join waitlist" button', async ({
    page,
  }) => {
    await page.goto("/");
    const open = eventCard(page, "Fall Musical: Into the Woods");
    await expect(open.getByRole("button", { name: "Buy" })).toBeVisible();
    await expect(open.getByRole("button", { name: "Join waitlist" })).toHaveCount(0);
  });

  test("Story 1 / AC2: the buttons say purchasing and the waitlist are coming soon", async ({
    page,
  }) => {
    await page.goto("/");
    const soldOut = eventCard(page, "Robotics Club Demo Day");
    await soldOut.getByRole("button", { name: "Join waitlist" }).click();
    await expect(soldOut.getByRole("status")).toHaveText(/coming soon/i);
  });
});

test.describe("Story 1 / UX: screen states", () => {
  test("Story 1 / UX: shows a loading state while events are fetched", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route("**/api/events", async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto("/");
    await expect(page.getByText("Loading events…")).toBeVisible();
    release();
    await expect(eventCard(page, "Fall Musical: Into the Woods")).toBeVisible();
    await expect(page.getByText("Loading events…")).toHaveCount(0);
  });

  test('Story 1 / UX: shows "No upcoming events yet." when there are none', async ({ page }) => {
    await page.route("**/api/events", (route) => route.fulfill({ json: { events: [] } }));
    await page.goto("/");
    await expect(page.getByText("No upcoming events yet.")).toBeVisible();
  });

  test("Story 1 / UX: shows an error with a working Try again button", async ({ page }) => {
    let fail = true;
    await page.route("**/api/events", (route) =>
      fail ? route.fulfill({ status: 500, body: "boom" }) : route.continue(),
    );
    await page.goto("/");
    await expect(
      page.getByRole("alert").filter({ hasText: "couldn't load events" }),
    ).toBeVisible();
    fail = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(eventCard(page, "Fall Musical: Into the Woods")).toBeVisible();
  });
});

test.describe("Story 1 / UX + security", () => {
  test("Story 1 / UX: the event buttons can be reached and pressed with the keyboard only", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(eventCard(page, "Robotics Club Demo Day")).toBeVisible();
    const waitlist = eventCard(page, "Robotics Club Demo Day").getByRole("button", {
      name: "Join waitlist",
    });
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      if (await waitlist.evaluate((el) => el === document.activeElement)) break;
    }
    await expect(waitlist).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(eventCard(page, "Robotics Club Demo Day").getByRole("status")).toHaveText(
      /coming soon/i,
    );
  });

  test("Story 1 / SEC-20: event text is shown as plain text, never run as code", async ({
    page,
  }) => {
    const evil = '<img src=x onerror="window.__pwned=1">Hack Night';
    await page.route("**/api/events", (route) =>
      route.fulfill({
        json: {
          events: [
            {
              event_id: "x",
              title: evil,
              starts_at: "2030-01-01T00:00:00Z",
              location: "<b>Gates</b>",
              price_cents: 500,
              seats_remaining: 5,
              sold_out: false,
            },
          ],
        },
      }),
    );
    await page.goto("/");
    await expect(page.getByRole("heading", { name: evil })).toBeVisible();
    await expect(page.getByText("<b>Gates</b>")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  });
});
