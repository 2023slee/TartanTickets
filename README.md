# Tartan Tickets

A class project for browsing events and simulated ticket booking.

## Non-goals

- Real sign-in, verified identity, or private notification delivery
- Real email, SMS, or push notifications
- Real payments, Stripe Checkout, refunds, or ticket issuance
- Database persistence, multi-server coordination, or production availability guarantees
- Implementing the other stories' purchase, event-management, and check-in workflows

## Security spec audit

Audit of the current classroom-demo implementation against [the security spec](./docs/Starter%20Spec%20A%20-%20Tartan%20Tickets%20-%20SECURITY_SPEC.md). “Not satisfied” means the required control or feature is not implemented in this project; it does not imply that a currently available user flow has been exploited.

| Requirement | Status | Brief explanation |
|---|---|---|
| SEC-1 | Not satisfied | No CMU SSO or authentication exists; real sign-in is a stated non-goal. |
| SEC-2 | Not satisfied | There is no session or inactivity-expiration implementation. |
| SEC-3 | Not satisfied | [next.config.ts](./next.config.ts) does not configure HTTPS enforcement or HSTS; deployment behavior is not guaranteed by this repository. |
| SEC-4 | Not satisfied | API routes have no user identity, role, or club-membership authorization checks. |
| SEC-5 | Not satisfied | Protected club resources and access-denied logging are not implemented. |
| SEC-6 | Not satisfied | Ticket lookup and ownership checks are not implemented. |
| SEC-7 | Not satisfied | Stripe Checkout and any real payment flow are absent by design. |
| SEC-8 | Not satisfied | There is no checkout or server-side charge calculation. |
| SEC-9 | Not satisfied | There is no Stripe webhook handler or signature verification. |
| SEC-10 | Not satisfied | There is no webhook processing or event-ID idempotency store. |
| SEC-11 | Not satisfied | No Stripe keys are used, but a secrets-manager or production/test-key policy is not implemented. |
| SEC-12 | Not satisfied | Connected Stripe-account changes and dual approval are not implemented. |
| SEC-13 | Not satisfied | Ticket issuance, QR tokens, and server-side token lookup are not implemented. |
| SEC-14 | Not satisfied | Ticket scanning and atomic single-use check-in are not implemented. |
| SEC-15 | Not satisfied | Invalid-scan rate limiting and officer notifications are not implemented. |
| SEC-16 | Not satisfied | Checkout creation and checkout-hoarding rate limiting are not implemented. |
| SEC-17 | Not satisfied | There is no purchase flow or purchase-record collection policy; the demo's sample event/order data is not a purchase implementation. |
| SEC-18 | Not satisfied | Attendee-retention cleanup is not implemented. |
| SEC-19 | Not satisfied | Attendee exports, officer-only access, field restriction, and export logging are not implemented. |
| SEC-20 | Partly | React renders event text as text, and [the browser test](./tests/e2e/story1-browse-events.spec.ts) covers injection-like event data; officer-entered descriptions and their rendering path do not exist. |
| SEC-21 | Not satisfied | The specified sensitive actions and audit-log recording are not implemented. |
| SEC-22 | Not satisfied | Append-only, admin-only, one-year audit-log storage is not implemented. |
| SEC-23 | Satisfied for the classroom demo | The server rejects names longer than 80 characters before storing an entry. Typed names still do not verify identity. |

### Selected security improvement: server-side waitlist name limit

This closes a validation gap in an existing demo flow and needs no authentication, database, or payment integration. The browser currently sets `maxLength={80}` in [EventList.tsx](./app/EventList.tsx), but [the waitlist API](./app/api/waitlist/route.ts) only verifies that `name` is a string, and [the waitlist service](./lib/waitlist.ts) normalizes and stores it without enforcing a maximum. Browser constraints can be bypassed by sending a direct request.

**Requirement (SEC-23):** If a student submits a waitlist name longer than 80 characters, then the system shall reject it on the server before storing a waitlist entry.

**Before audit row — captured before implementation:**

| Requirement | Status before implementation | Evidence |
|---|---|---|
| SEC-23 | Not satisfied | The browser has an 80-character limit, but the server route and waitlist service do not enforce it; existing waitlist tests do not cover overlong names. |