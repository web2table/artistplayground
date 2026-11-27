# Artist Playground Ticketing — Initial Architecture

Last reviewed: 2026-11-27

## Architecture boundary
- Keep the existing Astro 5 marketing website static-first.
- Build ticketing as a separate application surface and backend, integrated without turning the marketing site into a database-driven application.
- Use only the dedicated Artist Playground Supabase project for ticketing data and authentication.
- Keep all ticketing implementation on the Git branch `feature/ticketing-platform`. Do not modify `main`.
- Never connect this work to Web2Table's Supabase project, credentials, payments, or data.

## High-level components
1. **Public ticket storefront / checkout** — browses public productions and performances, selects ticket categories and quantities, captures purchaser and attendee details, and starts checkout.
2. **Shared staff login gateway** — one login screen backed by Supabase Auth.
3. **Role-based application views** — route authenticated users to the System Administrator or Staff view based on a server-controlled role.
4. **Ticketing backend** — owns inventory reservations, bookings, payment state transitions, ticket issuance, QR/reference lookup, redemption, refunds, and email delivery.
5. **Supabase database** — stores productions, performances, categories, inventory, bookings, attendees, tickets, payments, refunds, staff profiles, and audit events as the detailed schema is designed.
6. **External providers** — PayMongo for payment and an email provider for ticket delivery. Provider setup is pending.

## Trust boundaries and security rules
- Browser clients must never hold service-role or secret API keys.
- The backend, not the browser, decides whether a payment is settled and whether tickets may be issued.
- PayMongo webhook signatures must be verified before processing payment events. Also verify expected booking/payment references, amount, currency, and idempotency before changing state.
- A browser redirect or success page is not payment evidence.
- Digital box-office payments cannot be manually marked paid by staff.
- Staff role and System Administrator role must be stored in trusted server-controlled authorization data, not user-editable profile metadata.
- Every exposed database table must have RLS enabled and policies designed for the actual access model.
- QR token and reference number are two lookup identifiers for the same ticket row. Both lookup paths call the same backend validation/redemption logic.
- Ticket redemption must be atomic so concurrent scans cannot redeem the same ticket twice.
- Important actions (cash confirmation, ticket redemption, refund decisions, configuration/account changes) should be attributable to the authenticated staff/admin identity.
- Birthday data is personal data: collect only for the confirmed ticket workflow, restrict access, and define retention/privacy handling before production.

## Inventory and ticket model
- General admission only; no assigned seating.
- A production has one or more performances.
- Each performance has its own capacity and one or more ticket categories.
- Category allocations are bounded by performance capacity.
- Online and box-office sales share inventory.
- Each booking may contain multiple attendee/ticket rows.
- One purchaser email is associated with the booking; each attendee has a name and birthday.
- Each attendee gets one ticket row with a unique reference number and a unique QR token.
- One booking is the refund unit; approved refunds invalidate all tickets in that booking.

## Authentication and views
- One login gateway.
- Exactly two business-facing account roles: `system_admin` and `staff`.
- Role is assigned during trusted account provisioning and enforced server-side.
- After authentication, route to the corresponding dashboard.
- Staff has one uncomplicated access level for daily ticketing operations.
- System Administrator handles platform maintenance and staff/system configuration.
- No separate manager or CEO role.

## Delivery strategy
- Work in small, verifiable increments.
- Keep the first implementation focused on authentication foundations and documented architecture; do not prematurely build payment or ticket issuance before unresolved requirements are settled.
- Do not create production database tables or migrations until the schema is reviewed against the remaining open decisions.
- Add tests for critical invariants: shared inventory, webhook idempotency, one ticket identity across QR/reference lookup, atomic redemption, whole-booking refunds, and role isolation.
