"use client";

import { useCallback, useEffect, useState } from "react";
import { ROBOTICS_DEMO_EVENT_ID, type PublicEvent } from "../lib/events";
import { formatEventDate, formatPrice } from "../lib/format";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; events: PublicEvent[] };

type WaitlistOffer = { recipient_name: string; expires_at: string };

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

  const refreshEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { events: PublicEvent[] };
      setState({ kind: "ready", events: body.events });
    } catch {
      return;
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
          <EventCard event={event} onInventoryChange={refreshEvents} />
        </li>
      ))}
    </ul>
  );
}

function EventCard({
  event,
  onInventoryChange,
}: {
  event: PublicEvent;
  onInventoryChange: () => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState<WaitlistOffer | null>(null);
  const headingId = `event-${event.event_id}-title`;

  useEffect(() => {
    if (!event.sold_out) return;

    let active = true;
    fetch(`/api/waitlist?event_id=${encodeURIComponent(event.event_id)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const body = (await res.json()) as { offer: WaitlistOffer | null };
        if (active) setOffer(body.offer);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [event.event_id, event.sold_out]);

  async function joinWaitlist(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.event_id, name }),
      });
      const body = (await res.json()) as { position?: number; error?: string };
      if (!res.ok) {
        setMessage(
          body.error === "already_joined"
            ? "That name is already on this event's waitlist."
            : body.error === "invalid_name"
              ? "Enter a name to join the waitlist."
              : "This event's waitlist could not be joined.",
        );
        return;
      }
      setJoinOpen(false);
      setMessage(
        `You're on the waitlist at position ${body.position}. Typed names do not verify identity.`,
      );
    } catch {
      setMessage("The waitlist could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function simulateRelease() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/waitlist/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.event_id }),
      });
      const body = (await res.json()) as {
        offer?: WaitlistOffer | null;
        error?: string;
      };
      if (!res.ok) {
        setMessage("A seat could not be released in this classroom simulation.");
        return;
      }
      setOffer(body.offer ?? null);
      setMessage("Classroom simulation: seat release recorded.");
      await onInventoryChange();
    } catch {
      setMessage("The seat-release simulation could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resetWaitlistDemo() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/waitlist/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.event_id }),
      });
      if (!res.ok) {
        setMessage("The classroom waitlist demo could not be reset. Try again.");
        return;
      }

      setOffer(null);
      setJoinOpen(false);
      setName("");
      setMessage("The waitlist demo has been reset to its original sold-out state.");
      await onInventoryChange();
    } catch {
      setMessage("The classroom waitlist demo could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

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
          <>
            {joinOpen ? (
              <form className="waitlist-form" onSubmit={joinWaitlist}>
                <label htmlFor={`waitlist-name-${event.event_id}`}>Your name</label>
                <input
                  id={`waitlist-name-${event.event_id}`}
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  onChange={(inputEvent) => setName(inputEvent.target.value)}
                  disabled={busy}
                />
                <p className="waitlist-help">Typed names do not verify identity.</p>
                <div className="event-actions">
                  <button type="submit" className="button button-secondary" disabled={busy}>
                    Join waitlist
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setJoinOpen(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setJoinOpen(true)}
              >
                Join waitlist
              </button>
            )}
            <button
              type="button"
              className="button button-secondary"
              onClick={simulateRelease}
              disabled={busy}
            >
              Simulate seat release (classroom simulation)
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="button"
              onClick={() => setMessage("Ticket purchasing is coming soon.")}
            >
              Buy
            </button>
            {event.event_id === ROBOTICS_DEMO_EVENT_ID && (
              <p className="event-message">
                Waitlist and seat-release simulation are available when this event is sold out.
              </p>
            )}
          </>
        )}
        {event.event_id === ROBOTICS_DEMO_EVENT_ID && (
          <button
            type="button"
            className="button button-secondary"
            onClick={resetWaitlistDemo}
            disabled={busy}
          >
            Reset waitlist demo
          </button>
        )}
        <p role="status" className="event-message">
          {message}
        </p>
        {offer && (
          <p role="status" className="event-message waitlist-notification">
            Classroom simulation: {offer.recipient_name} has a seat held until{" "}
            {new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(offer.expires_at))}.
          </p>
        )}
      </div>
    </article>
  );
}
