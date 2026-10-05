// Events and orders, kept in server memory for now (no database yet).
// Field names follow the data model in docs/requirements.md §4.

export type EventRecord = {
  event_id: string;
  club_id: string;
  title: string;
  starts_at: string; // ISO 8601, UTC
  location: string;
  price_cents: number;
  capacity: number;
  status: "published" | "cancelled";
};

export type OrderRecord = {
  order_id: string;
  user_id: string;
  event_id: string;
  seats: number;
  // pending = seats held during checkout; released/refunded no longer use seats
  status: "pending" | "paid" | "released" | "refunded";
  created_at: string;
};

/** What a student is allowed to see about an event. */
export type PublicEvent = {
  event_id: string;
  title: string;
  starts_at: string;
  location: string;
  price_cents: number;
  seats_remaining: number;
  sold_out: boolean;
};

export type Store = { events: EventRecord[]; orders: OrderRecord[] };

const SEAT_USING_STATUSES: ReadonlySet<OrderRecord["status"]> = new Set(["pending", "paid"]);

export function createStore(events: EventRecord[], orders: OrderRecord[]): Store {
  return { events: [...events], orders: [...orders] };
}

export function seatsRemaining(store: Store, event: EventRecord): number {
  const taken = store.orders
    .filter((o) => o.event_id === event.event_id && SEAT_USING_STATUSES.has(o.status))
    .reduce((sum, o) => sum + o.seats, 0);
  return Math.max(0, event.capacity - taken);
}

/** Story 1: published events that haven't started yet, soonest first. */
export function listUpcomingEvents(store: Store, now: Date): PublicEvent[] {
  return store.events
    .filter((e) => e.status === "published" && new Date(e.starts_at).getTime() > now.getTime())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .map((e) => {
      const remaining = seatsRemaining(store, e);
      return {
        event_id: e.event_id,
        title: e.title,
        starts_at: e.starts_at,
        location: e.location,
        price_cents: e.price_cents,
        seats_remaining: remaining,
        sold_out: remaining === 0,
      };
    });
}

// ---------------------------------------------------------------------------
// Sample data. Dates are relative to when the server starts so the demo
// always has upcoming events. Everything resets when the server restarts.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function seed(now: Date): Store {
  const startOfHour = Math.floor(now.getTime() / HOUR) * HOUR;
  const at = (days: number) => new Date(startOfHour + days * DAY).toISOString();

  const events: EventRecord[] = [
    {
      event_id: "evt_musical",
      club_id: "club_scotchnsoda",
      title: "Fall Musical: Into the Woods",
      starts_at: at(5),
      location: "Purnell Center, Philip Chosky Theater",
      price_cents: 1200,
      capacity: 120,
      status: "published",
    },
    {
      event_id: "evt_booth",
      club_id: "club_carnival",
      title: "Carnival Booth Build Night",
      starts_at: at(2),
      location: "Midway Tent, The Cut",
      price_cents: 0,
      capacity: 40,
      status: "published",
    },
    {
      event_id: "evt_robotics",
      club_id: "club_robotics",
      title: "Robotics Club Demo Day",
      starts_at: at(9),
      location: "Newell-Simon Hall 3305",
      price_cents: 500,
      capacity: 30,
      status: "published",
    },
    {
      event_id: "evt_jazz",
      club_id: "club_jazz",
      title: "Jazz Ensemble Fall Concert",
      starts_at: at(14),
      location: "Kresge Theatre, CFA",
      price_cents: 850,
      capacity: 200,
      status: "published",
    },
    {
      event_id: "evt_mixer",
      club_id: "club_activities",
      title: "Welcome Back Mixer",
      starts_at: at(-3),
      location: "Rangos Ballroom, Cohon Center",
      price_cents: 0,
      capacity: 300,
      status: "published",
    },
    {
      event_id: "evt_movies",
      club_id: "club_film",
      title: "Midnight Movie Marathon",
      starts_at: at(7),
      location: "McConomy Auditorium",
      price_cents: 300,
      capacity: 250,
      status: "cancelled",
    },
  ];

  const created_at = now.toISOString();
  const orders: OrderRecord[] = [
    { order_id: "ord_1", user_id: "seed", event_id: "evt_musical", seats: 37, status: "paid", created_at },
    { order_id: "ord_2", user_id: "seed", event_id: "evt_robotics", seats: 30, status: "paid", created_at },
    { order_id: "ord_3", user_id: "seed", event_id: "evt_jazz", seats: 4, status: "released", created_at },
  ];

  return createStore(events, orders);
}

// One shared store per server process. Kept on globalThis so it survives
// hot reloads in development.
const globalForStore = globalThis as unknown as { __tartanStore?: Store };

export function getStore(): Store {
  globalForStore.__tartanStore ??= seed(new Date());
  return globalForStore.__tartanStore;
}
