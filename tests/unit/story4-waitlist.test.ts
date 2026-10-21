// Story 4 / AC1: a released seat is offered to the next waiter and held for 30 minutes.
// The waitlist service is intentionally absent until the Story 4 implementation.
import { describe, expect, it } from "vitest";
import { createStore, type EventRecord, type OrderRecord, type Store } from "../../lib/events";

type WaitlistOffer = { recipient_name: string; expires_at: string };
type WaitlistSnapshot = {
  queue: { name: string; position: number }[];
  offer: WaitlistOffer | null;
  available_seats: number;
};

type WaitlistService = {
  join(eventId: string, name: string): { position?: number; error?: string };
  releaseSeat(eventId: string): WaitlistOffer | null;
  getState(eventId: string): WaitlistSnapshot;
};

type WaitlistModule = {
  createWaitlistService: (store: Store, options: { now: () => Date }) => WaitlistService;
};

const modules = import.meta.glob("../../lib/waitlist.ts", { eager: true }) as Record<
  string,
  WaitlistModule
>;
const waitlistModule = modules["../../lib/waitlist.ts"];

const NOW = new Date("2026-10-21T12:00:00.000Z");

function event(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    event_id: "evt_waitlist",
    club_id: "club_demo",
    title: "Waitlist Demo",
    starts_at: "2026-11-01T20:00:00.000Z",
    location: "Cohon Center",
    price_cents: 0,
    capacity: 1,
    status: "published",
    ...overrides,
  };
}

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    order_id: "ord_demo",
    user_id: "demo",
    event_id: "evt_waitlist",
    seats: 1,
    status: "paid",
    created_at: NOW.toISOString(),
    ...overrides,
  };
}

function serviceAt(now: () => Date = () => new Date(NOW)) {
  expect(
    waitlistModule?.createWaitlistService,
    "Story 4 behavior is missing: lib/waitlist.ts must export createWaitlistService",
  ).toBeTypeOf("function");
  if (!waitlistModule) return undefined;

  return waitlistModule.createWaitlistService(
    createStore([event()], [order()]),
    { now },
  );
}

describe("Story 4 / AC1: joining the waitlist", () => {
  it("accepts a typed name and assigns the first FIFO position", () => {
    const service = serviceAt();
    if (!service) return;

    expect(service.join("evt_waitlist", "Avery Chen")).toEqual({ position: 1 });
  });

  it("rejects blank names", () => {
    const service = serviceAt();
    if (!service) return;

    expect(service.join("evt_waitlist", "   ")).toMatchObject({ error: "invalid_name" });
  });

  it("rejects duplicate active entries for the same event and normalized name", () => {
    const service = serviceAt();
    if (!service) return;

    service.join("evt_waitlist", " Avery   Chen ");
    expect(service.join("evt_waitlist", "avery chen")).toMatchObject({
      error: "already_joined",
    });
  });

  it("keeps entries in first-in, first-out order", () => {
    const service = serviceAt();
    if (!service) return;

    service.join("evt_waitlist", "Avery Chen");
    service.join("evt_waitlist", "Jordan Lee");
    service.join("evt_waitlist", "Morgan Patel");

    expect(service.getState("evt_waitlist").queue.map((entry) => entry.name)).toEqual([
      "Avery Chen",
      "Jordan Lee",
      "Morgan Patel",
    ]);
  });
});

describe("Story 4 / AC1: seat offer and expiry", () => {
  it("offers a released seat exclusively to the next person and records a 30-minute deadline", () => {
    const service = serviceAt();
    if (!service) return;
    service.join("evt_waitlist", "Avery Chen");
    service.join("evt_waitlist", "Jordan Lee");

    const offer = service.releaseSeat("evt_waitlist");

    expect(offer?.recipient_name).toBe("Avery Chen");
    expect(Date.parse(offer!.expires_at) - NOW.getTime()).toBe(30 * 60 * 1000);
    expect(service.getState("evt_waitlist")).toMatchObject({
      offer: { recipient_name: "Avery Chen" },
      queue: [{ name: "Jordan Lee", position: 1 }],
      available_seats: 0,
    });
  });

  it("keeps the seat held through 29:59 and promotes the next waiter at 30:00", () => {
    let now = new Date(NOW);
    const service = serviceAt(() => now);
    if (!service) return;
    service.join("evt_waitlist", "Avery Chen");
    service.join("evt_waitlist", "Jordan Lee");
    service.releaseSeat("evt_waitlist");

    now = new Date(NOW.getTime() + 30 * 60 * 1000 - 1000);
    expect(service.getState("evt_waitlist").offer?.recipient_name).toBe("Avery Chen");

    now = new Date(NOW.getTime() + 30 * 60 * 1000);
    expect(service.getState("evt_waitlist")).toMatchObject({
      offer: { recipient_name: "Jordan Lee" },
      queue: [],
      available_seats: 0,
    });
    expect(Date.parse(service.getState("evt_waitlist").offer!.expires_at) - now.getTime()).toBe(
      30 * 60 * 1000,
    );
  });

  it("returns the seat to inventory when an offer expires and nobody else is waiting", () => {
    let now = new Date(NOW);
    const service = serviceAt(() => now);
    if (!service) return;
    service.join("evt_waitlist", "Avery Chen");
    service.releaseSeat("evt_waitlist");

    now = new Date(NOW.getTime() + 30 * 60 * 1000);
    expect(service.getState("evt_waitlist")).toMatchObject({
      offer: null,
      queue: [],
      available_seats: 1,
    });
  });
});