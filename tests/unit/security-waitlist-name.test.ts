import { describe, expect, it } from "vitest";
import { GET, POST } from "../../app/api/waitlist/route";

describe("SEC-23: server-side waitlist name length", () => {
  it("Rejects an overlong waitlist name sent directly to the server route.", async () => {
    const request = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: "evt_robotics", name: "A".repeat(81) }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_name" });

    const stateResponse = await GET(
      new Request("http://localhost/api/waitlist?event_id=evt_robotics"),
    );
    const state = await stateResponse.json();
    expect(state.queue).not.toContainEqual(expect.objectContaining({ name: "A".repeat(81) }));
  });
});