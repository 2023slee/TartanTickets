// Story 1: Browse events
// "As a student, I want to see upcoming events so that I can choose one to attend."
//
// Story 1 / AC1: THE system SHALL list upcoming events with the date, location,
//                price, and seats remaining.
// Story 1 / AC2: WHILE an event is sold out, THE system SHALL show a
//                "Join waitlist" button instead of "Buy".
//                (Unit level: the API must say which events are sold out.)
import { describe, expect, it } from "vitest";
import {
  createStore,
  listUpcomingEvents,
  type EventRecord,
  type OrderRecord,
} from "../../lib/events";
import { formatEventDate, formatPrice } from "../../lib/format";
import { contrastRatio, tokens } from "../../lib/tokens";
import { GET } from "../../app/api/events/route";

const NOW = new Date("2026-10-01T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY).toISOString();

function event(overrides: Partial<EventRecord>): EventRecord {
  return {
    event_id: "evt",
    club_id: "club",
    title: "An event",
    starts_at: inDays(1),
    location: "Cohon Center",
    price_cents: 1000,
    capacity: 10,
    status: "published",
    ...overrides,
  };
}

function order(overrides: Partial<OrderRecord>): OrderRecord {
  return {
    order_id: "ord",
    user_id: "user",
    event_id: "evt",
    seats: 1,
    status: "paid",
    created_at: NOW.toISOString(),
    ...overrides,
  };
}

describe("Story 1 / AC1: list upcoming events", () => {
  it("Story 1 / AC1: returns title, date, location, price, and seats remaining for each event", () => {
    const store = createStore([event({ event_id: "a", title: "Jazz Night" })], []);
    const [e] = listUpcomingEvents(store, NOW);
    expect(e).toMatchObject({
      event_id: "a",
      title: "Jazz Night",
      starts_at: inDays(1),
      location: "Cohon Center",
      price_cents: 1000,
      seats_remaining: 10,
    });
  });

  it("Story 1 / AC1: only lists upcoming events (hides past and cancelled events)", () => {
    const store = createStore(
      [
        event({ event_id: "past", starts_at: inDays(-1) }),
        event({ event_id: "cancelled", status: "cancelled" }),
        event({ event_id: "future" }),
      ],
      [],
    );
    expect(listUpcomingEvents(store, NOW).map((e) => e.event_id)).toEqual(["future"]);
  });

  it("Story 1 / AC1: lists the soonest event first", () => {
    const store = createStore(
      [
        event({ event_id: "later", starts_at: inDays(9) }),
        event({ event_id: "soonest", starts_at: inDays(1) }),
        event({ event_id: "middle", starts_at: inDays(4) }),
      ],
      [],
    );
    expect(listUpcomingEvents(store, NOW).map((e) => e.event_id)).toEqual([
      "soonest",
      "middle",
      "later",
    ]);
  });

  it("Story 1 / AC1: seats remaining = capacity minus paid and held (pending) seats", () => {
    const store = createStore(
      [event({ event_id: "a", capacity: 10 })],
      [
        order({ order_id: "1", event_id: "a", seats: 3, status: "paid" }),
        order({ order_id: "2", event_id: "a", seats: 2, status: "pending" }),
        order({ order_id: "3", event_id: "a", seats: 4, status: "released" }),
        order({ order_id: "4", event_id: "a", seats: 1, status: "refunded" }),
        order({ order_id: "5", event_id: "other", seats: 4, status: "paid" }),
      ],
    );
    expect(listUpcomingEvents(store, NOW)[0].seats_remaining).toBe(5);
  });

  it("Story 1 / AC1: GET /api/events responds 200 with the upcoming events as JSON", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events.length).toBeGreaterThan(0);
    for (const e of body.events) {
      expect(e).toEqual(
        expect.objectContaining({
          event_id: expect.any(String),
          title: expect.any(String),
          starts_at: expect.any(String),
          location: expect.any(String),
          price_cents: expect.any(Number),
          seats_remaining: expect.any(Number),
          sold_out: expect.any(Boolean),
        }),
      );
      expect(new Date(e.starts_at).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it("Story 1 / AC1: prices display as dollars, and $0 displays as Free", () => {
    expect(formatPrice(1200)).toBe("$12.00");
    expect(formatPrice(850)).toBe("$8.50");
    expect(formatPrice(0)).toBe("Free");
  });

  it("Story 1 / AC1: dates display in Pittsburgh (Eastern) time", () => {
    // 23:30 UTC on Oct 9 is 7:30 PM Eastern (EDT) on Oct 9
    expect(formatEventDate("2026-10-09T23:30:00Z")).toBe("Fri, Oct 9 · 7:30 PM");
    // 03:00 UTC on Oct 10 is still Oct 9 in Pittsburgh
    expect(formatEventDate("2026-10-10T03:00:00Z")).toBe("Fri, Oct 9 · 11:00 PM");
  });
});

describe("Story 1 / AC2: sold-out events", () => {
  it("Story 1 / AC2: an event with zero seats remaining is marked sold out", () => {
    const store = createStore(
      [event({ event_id: "full", capacity: 4 }), event({ event_id: "open", capacity: 4 })],
      [order({ event_id: "full", seats: 4, status: "paid" })],
    );
    const byId = Object.fromEntries(listUpcomingEvents(store, NOW).map((e) => [e.event_id, e]));
    expect(byId.full).toMatchObject({ seats_remaining: 0, sold_out: true });
    expect(byId.open).toMatchObject({ seats_remaining: 4, sold_out: false });
  });

  it("Story 1 / AC2: seats remaining never goes below zero", () => {
    const store = createStore(
      [event({ event_id: "a", capacity: 2 })],
      [order({ event_id: "a", seats: 3, status: "paid" })],
    );
    expect(listUpcomingEvents(store, NOW)[0]).toMatchObject({
      seats_remaining: 0,
      sold_out: true,
    });
  });
});

describe("Story 1 / UX spec: readable colors", () => {
  it("Story 1 / UX: ink text on surface has at least 4.5:1 contrast", () => {
    expect(contrastRatio(tokens.ink, tokens.surface)).toBeGreaterThanOrEqual(4.5);
  });
  it("Story 1 / UX: muted text on surface has at least 4.5:1 contrast", () => {
    expect(contrastRatio(tokens.muted, tokens.surface)).toBeGreaterThanOrEqual(4.5);
  });
  it("Story 1 / UX: button text on accent has at least 4.5:1 contrast", () => {
    expect(contrastRatio(tokens.onAccent, tokens.accent)).toBeGreaterThanOrEqual(4.5);
  });
});
