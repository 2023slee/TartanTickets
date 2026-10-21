import { getStore, ROBOTICS_DEMO_EVENT_ID } from "../../../../lib/events";
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
  if (body.event_id !== ROBOTICS_DEMO_EVENT_ID) {
    return Response.json({ error: "event_not_found" }, { status: 404 });
  }

  const event = getStore().events.find((candidate) => candidate.event_id === body.event_id);
  if (!event || event.status !== "published") {
    return Response.json({ error: "event_not_found" }, { status: 404 });
  }

  const state = getWaitlistService().reset(event.event_id);
  return Response.json(state, { status: 200 });
}
