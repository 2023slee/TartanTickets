import { getStore } from "../../../lib/events";
import { getWaitlistService } from "../../../lib/waitlist";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("event_id");
  const event = getStore().events.find((candidate) => candidate.event_id === eventId);
  if (!event || event.status !== "published") {
    return Response.json({ error: "event_not_found" }, { status: 404 });
  }

  return Response.json(getWaitlistService().getState(event.event_id), { status: 200 });
}

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
    typeof body.event_id !== "string" ||
    !("name" in body) ||
    typeof body.name !== "string"
  ) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = getWaitlistService().join(body.event_id, body.name);
  if (result.error) {
    const status =
      result.error === "event_not_found"
        ? 404
        : result.error === "already_joined" || result.error === "event_not_sold_out"
          ? 409
          : 400;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json({ position: result.position }, { status: 201 });
}