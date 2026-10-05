"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicEvent } from "../lib/events";
import { formatEventDate, formatPrice } from "../lib/format";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; events: PublicEvent[] };

export default function EventList() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { events: PublicEvent[] };
      setState({ kind: "ready", events: body.events });
    } catch {
      setState({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <p className="notice" role="status">
        Loading events…
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="notice notice-error" role="alert">
        <p>Sorry, we couldn't load events. Check your connection and try again.</p>
        <button type="button" className="button button-secondary" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  if (state.events.length === 0) {
    return <p className="notice">No upcoming events yet.</p>;
  }

  return (
    <ul className="event-list">
      {state.events.map((event) => (
        <li key={event.event_id}>
          <EventCard event={event} />
        </li>
      ))}
    </ul>
  );
}

function EventCard({ event }: { event: PublicEvent }) {
  const [message, setMessage] = useState("");
  const headingId = `event-${event.event_id}-title`;

  // Text is rendered through React, which always treats it as plain text (SEC-20).
  return (
    <article className="event-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="event-title">
        {event.title}
      </h2>
      <dl className="event-details">
        <div>
          <dt>When</dt>
          <dd data-testid="event-date">
            <time dateTime={event.starts_at}>{formatEventDate(event.starts_at)}</time>
          </dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd data-testid="event-location">{event.location}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd data-testid="event-price">{formatPrice(event.price_cents)}</dd>
        </div>
        <div>
          <dt>Seats</dt>
          <dd data-testid="event-seats" className={event.sold_out ? "sold-out" : undefined}>
            {event.sold_out
              ? "Sold out"
              : `${event.seats_remaining} ${event.seats_remaining === 1 ? "seat" : "seats"} left`}
          </dd>
        </div>
      </dl>
      <div className="event-actions">
        {event.sold_out ? (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setMessage("The waitlist is coming soon.")}
          >
            Join waitlist
          </button>
        ) : (
          <button
            type="button"
            className="button"
            onClick={() => setMessage("Ticket purchasing is coming soon.")}
          >
            Buy
          </button>
        )}
        <p role="status" className="event-message">
          {message}
        </p>
      </div>
    </article>
  );
}
