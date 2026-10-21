import { getStore, seatsRemaining } from "../../../../lib/events";
import { getWaitlistService } from "../../../../lib/waitlist";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("event_id" in body) ||
    typeof body.event_id !== "string"
  ) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const store = getStore();
  const event = store.events.find((candidate) => candidate.event_id === body.event_id);
  if (!event || event.status !== "published") {
    return Response.json({ error: "event_not_found" }, { status: 404 });
  }
  if (seatsRemaining(store, event) > 0) {
    return Response.json({ error: "event_not_sold_out" }, { status: 409 });
  }

  const waitlist = getWaitlistService();
  const offer = waitlist.releaseSeat(event.event_id);
  if (!offer && waitlist.getState(event.event_id).available_seats === 0) {
    return Response.json({ error: "no_releasable_seat" }, { status: 409 });
  }

  return Response.json(
    { offer, state: waitlist.getState(event.event_id) },
    { status: 200 },
  );
}