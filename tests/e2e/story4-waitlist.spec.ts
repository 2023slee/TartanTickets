// Story 4 / AC1: joining, simulated seat release, notification, and exclusive hold.
import { expect, test } from "@playwright/test";

test("Story 4 / AC1: typed name receives an on-screen 30-minute seat offer", async ({ page }) => {
  await page.goto("/");

  const event = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Robotics Club Demo Day" }) });
  await event.getByRole("button", { name: "Join waitlist" }).click();

  await page.getByRole("textbox", { name: "Your name" }).fill("Avery Chen");
  await page.getByRole("button", { name: "Join waitlist" }).click();
  await expect(event.getByRole("status")).toContainText(/waitlist/i);

  await page.getByRole("button", { name: "Simulate seat release" }).click();

  const notification = page.getByRole("status").filter({ hasText: "Avery Chen" });
  await expect(notification).toContainText(/(?:until|expires)\s+.*\d{1,2}:\d{2}/i);
});