import { getStore, seatsRemaining, type Store } from "./events";

const HOLD_DURATION_MS = 30 * 60 * 1000;

type Entry = {
  id: number;
  name: string;
  normalizedName: string;
  status: "waiting" | "offered" | "expired";
};

type ActiveOffer = {
  entryId: number;
  recipient_name: string;
  expires_at: string;
};

type EventWaitlist = {
  entries: Entry[];
  offers: ActiveOffer[];
};

export type WaitlistOffer = { recipient_name: string; expires_at: string };

export type WaitlistSnapshot = {
  queue: { name: string; position: number }[];
  offer: WaitlistOffer | null;
  available_seats: number;
};

export type WaitlistService = {
  join(eventId: string, name: string): { position?: number; error?: string };
  releaseSeat(eventId: string): WaitlistOffer | null;
  getState(eventId: string): WaitlistSnapshot;
  reset(eventId: string): WaitlistSnapshot;
};

function normalizeName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function createWaitlistService(
  store: Store,
  options: { now: () => Date } = { now: () => new Date() },
): WaitlistService {
  const eventWaitlists = new Map<string, EventWaitlist>();
  store.waitlistInventory ??= {};
  let nextEntryId = 1;

  function getEventWaitlist(eventId: string): EventWaitlist {
    let state = eventWaitlists.get(eventId);
    if (!state) {
      state = { entries: [], offers: [] };
      eventWaitlists.set(eventId, state);
    }
    return state;
  }

  function inventoryFor(eventId: string) {
    store.waitlistInventory![eventId] ??= { released: 0, held: 0 };
    return store.waitlistInventory![eventId];
  }

  function promote(eventId: string, state: EventWaitlist): WaitlistOffer[] {
    const inventory = inventoryFor(eventId);
    const created: WaitlistOffer[] = [];
    let available = inventory.released - inventory.held;

    while (available > 0) {
      const entry = state.entries.find((candidate) => candidate.status === "waiting");
      if (!entry) break;

      entry.status = "offered";
      const offer: ActiveOffer = {
        entryId: entry.id,
        recipient_name: entry.name,
        expires_at: new Date(options.now().getTime() + HOLD_DURATION_MS).toISOString(),
      };
      state.offers.push(offer);
      created.push({ recipient_name: offer.recipient_name, expires_at: offer.expires_at });
      inventory.held += 1;
      available -= 1;
    }

    return created;
  }

  function processExpiry(eventId: string, state: EventWaitlist): void {
    const now = options.now().getTime();
    const inventory = inventoryFor(eventId);
    const expired = state.offers.filter((offer) => Date.parse(offer.expires_at) <= now);
    if (expired.length === 0) return;

    for (const offer of expired) {
      const entry = state.entries.find((candidate) => candidate.id === offer.entryId);
      if (entry) entry.status = "expired";
    }

    state.offers = state.offers.filter((offer) => Date.parse(offer.expires_at) > now);
    inventory.held -= expired.length;
    promote(eventId, state);
  }

  function getState(eventId: string): WaitlistSnapshot {
    const state = getEventWaitlist(eventId);
    processExpiry(eventId, state);
    const queue = state.entries
      .filter((entry) => entry.status === "waiting")
      .map((entry, index) => ({ name: entry.name, position: index + 1 }));
    const firstOffer = state.offers[0];
    const inventory = inventoryFor(eventId);

    return {
      queue,
      offer: firstOffer
        ? { recipient_name: firstOffer.recipient_name, expires_at: firstOffer.expires_at }
        : null,
      available_seats: inventory.released - inventory.held,
    };
  }

  return {
    join(eventId, name) {
      const event = store.events.find((candidate) => candidate.event_id === eventId);
      if (!event || event.status !== "published") return { error: "event_not_found" };

      const normalizedName = normalizeName(name);
      if (!normalizedName) return { error: "invalid_name" };
      if (seatsRemaining(store, event) > 0) return { error: "event_not_sold_out" };

      const state = getEventWaitlist(eventId);
      processExpiry(eventId, state);
      if (
        state.entries.some(
          (entry) =>
            entry.normalizedName === normalizedName &&
            (entry.status === "waiting" || entry.status === "offered"),
        )
      ) {
        return { error: "already_joined" };
      }

      const entry: Entry = {
        id: nextEntryId++,
        name: name.normalize("NFKC").trim().replace(/\s+/g, " "),
        normalizedName,
        status: "waiting",
      };
      state.entries.push(entry);
      return {
        position: state.entries.filter((candidate) => candidate.status === "waiting").length,
      };
    },

    releaseSeat(eventId) {
      const event = store.events.find((candidate) => candidate.event_id === eventId);
      if (!event || event.status !== "published") return null;

      const state = getEventWaitlist(eventId);
      processExpiry(eventId, state);
      const inventory = inventoryFor(eventId);
      const occupied = store.orders
        .filter(
          (order) =>
            order.event_id === eventId &&
            (order.status === "pending" || order.status === "paid"),
        )
        .reduce((total, order) => total + order.seats, 0);
      if (inventory.released >= occupied) return null;

      inventory.released += 1;
      const offers = promote(eventId, state);
      return offers.at(-1) ?? null;
    },

    getState,

    reset(eventId) {
      eventWaitlists.delete(eventId);
      store.waitlistInventory![eventId] = { released: 0, held: 0 };
      return getState(eventId);
    },
  };
}

const globalForWaitlist = globalThis as unknown as {
  __tartanWaitlistService?: WaitlistService;
};

export function getWaitlistService(): WaitlistService {
  globalForWaitlist.__tartanWaitlistService ??= createWaitlistService(getStore());
  return globalForWaitlist.__tartanWaitlistService;
}