import { getStore, listUpcomingEvents } from "../../../lib/events";

// Always compute fresh: seats change as tickets sell.
export const dynamic = "force-dynamic";

// GET /api/events — public list of upcoming events (Story 1).
export async function GET() {
  const events = listUpcomingEvents(getStore(), new Date());
  return Response.json({ events }, { status: 200 });
}
