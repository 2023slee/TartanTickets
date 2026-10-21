// Story 4 / AC1: joining, simulated seat release, notification, and exclusive hold.
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("Story 4 / AC1: typed name receives an on-screen 30-minute seat offer", async ({ page }) => {
  await page.goto("/");

  const event = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Robotics Club Demo Day" }) });
  const resetResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/waitlist/reset") && response.request().method() === "POST",
  );
  await event.getByRole("button", { name: "Reset waitlist demo" }).click();
  expect((await resetResponse).status()).toBe(200);

  await event.getByRole("button", { name: "Join waitlist" }).click();

  await page.getByRole("textbox", { name: "Your name" }).fill("Avery Chen");
  await page.getByRole("button", { name: "Join waitlist" }).click();
  await expect(event.getByRole("status")).toContainText(/waitlist/i);

  await page.getByRole("button", { name: "Simulate seat release" }).click();

  const notification = page.getByRole("status").filter({ hasText: "Avery Chen" });
  await expect(notification).toContainText(/(?:until|expires)\s+.*\d{1,2}:\d{2}/i);
});

test("Story 4 / demo: reset restores Robotics Club Demo Day after a seat release", async ({
  page,
}) => {
  await page.goto("/");

  const event = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Robotics Club Demo Day" }) });
  const initialResetResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/waitlist/reset") && response.request().method() === "POST",
  );
  await event.getByRole("button", { name: "Reset waitlist demo" }).click();
  expect((await initialResetResponse).status()).toBe(200);

  await event.getByRole("button", { name: "Join waitlist" }).click();
  await page.getByRole("textbox", { name: "Your name" }).fill("Avery Chen");
  await page.getByRole("button", { name: "Join waitlist" }).click();
  await expect(event.getByRole("status")).toContainText(/waitlist/i);
  await event.getByRole("button", { name: "Simulate seat release" }).click();
  await expect(event.getByRole("status").filter({ hasText: "Avery Chen" })).toBeVisible();

  const reset = event.getByRole("button", { name: "Reset waitlist demo" });
  await expect(reset).toBeVisible();
  const resetResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/waitlist/reset") && response.request().method() === "POST",
  );
  await reset.click();
  expect((await resetResponse).status()).toBe(200);

  const stateResponse = await page.request.get("/api/waitlist?event_id=evt_robotics");
  expect(stateResponse.ok()).toBe(true);
  await expect(stateResponse.json()).resolves.toMatchObject({
    queue: [],
    offer: null,
    available_seats: 0,
  });
  await expect(event.getByTestId("event-seats")).toHaveText("Sold out");

  await event.getByRole("button", { name: "Simulate seat release" }).click();
  await expect(event.getByTestId("event-seats")).toHaveText("1 seat left");
  await expect(
    event.getByText(
      /waitlist and seat-release simulation are available when this event is sold out/i,
    ),
  ).toBeVisible();
  await expect(reset).toBeVisible();
  await reset.click();
  await expect(event.getByTestId("event-seats")).toHaveText("Sold out");
});
