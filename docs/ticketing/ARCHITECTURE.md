# Artist Playground Ticketing — Revised Unified-Site Architecture

Last reviewed: 2026-11-27

## Core decision
Ticketing will be part of the **existing Artist Playground website**, not a separate website, subdomain, or independently branded application.

- Keep the existing Astro 5 website and its current hosting approach.
- Add ticketing pages as routes within the same Astro project and website origin, using the existing site navigation and visual identity.
- Keep the marketing pages static-first. Ticketing pages can also be statically delivered as frontend pages; dynamic data and secure operations are handled by Supabase.
- Use the dedicated Artist Playground Supabase project for ticketing data, authentication, and backend functions.
- No separate ticketing frontend deployment is planned.
- Keep all work on `feature/ticketing-platform`; do not modify `main`.
- Never connect this project to Web2Table's Supabase project, credentials, payments, or data.

## How the unified website works
1. **Existing Astro website** — remains the single public website and serves marketing content.
2. **Public ticketing routes** — added inside the same Astro project for productions, performances, ticket selection, checkout initiation, and booking confirmation.
3. **Shared staff login route** — one login page within the same website.
4. **Role-based staff routes** — after login, the same website directs the account to either the System Administrator view or Staff view.
5. **Supabase Auth** — authenticates staff accounts.
6. **Supabase database and Row Level Security** — stores and protects ticketing records.
7. **Supabase Edge Functions** — handles trusted server-side operations and third-party integrations, including PayMongo webhooks, checkout session creation, payment verification, ticket issuance, QR/reference validation and redemption, refunds, and email delivery.

The browser talks to Supabase using a publishable key and the signed-in user's session. The publishable key is not a secret; database access is constrained by RLS. Privileged credentials and provider secrets stay in Edge Function secrets and are never included in the Astro frontend.

## Hosting and routing
- Retain the current Astro static build and hosting unless a verified technical limitation requires a change.
- Ticketing screens are normal routes in the existing website (for example, `/tickets/`, `/staff/login/`, `/staff/`, and `/system/`); final route names will follow the existing site's base-path configuration.
- Do not create a separate subdomain or a second customer-facing website.
- Because the frontend is static-hosted, it must not contain server-only code or secrets. All privileged operations go through Supabase Edge Functions and secured database functions/RLS.
- Check the existing GitHub Pages base path and client-side navigation behavior before implementing routes. If the site later moves to a custom domain, keep the same unified-site route structure.

## Trust boundaries and security rules
- Browser clients must never hold service-role or secret API keys.
- The backend, not the browser, decides whether a payment is settled and whether tickets may be issued.
- PayMongo webhook signatures must be verified before processing payment events. Also verify expected booking/payment references, amount, currency, and idempotency before changing state.
- A browser redirect or success page is never payment evidence.
- Digital box-office payments cannot be manually marked paid by staff.
- Staff and System Administrator roles must be stored in trusted server-controlled authorization data, not user-editable profile metadata.
- Every exposed database table must have RLS enabled and policies designed for the actual access model.
- Edge Functions must verify the caller's authenticated identity and role for staff/admin operations.
- QR token and reference number are two lookup identifiers for the same ticket row. Both lookup paths call the same backend validation/redemption logic.
- Ticket redemption must be atomic so concurrent scans cannot redeem the same ticket twice.
- Important actions (cash confirmation, ticket redemption, refund decisions, configuration/account changes) must be attributable to the authenticated staff/admin identity.
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
- One login route in the existing Artist Playground website.
- Exactly two account roles: `system_admin` and `staff`.
- Role is assigned during trusted account provisioning and enforced by backend/database policies.
- After authentication, route to the corresponding view within the same website.
- Staff has one uncomplicated access level for daily ticketing operations.
- System Administrator handles platform maintenance and staff/system configuration.
- No separate manager or CEO role.

## Delivery strategy
- Work in small, verifiable increments.
- First inspect existing Astro routing, layout, CSS tokens, and GitHub Pages deployment behavior.
- Add ticketing routes and components without redesigning existing marketing pages.
- Build and test the shared login experience and role routing before implementing payment or ticket issuance.
- Do not create production database tables or migrations until the schema is reviewed against remaining open decisions.
- Add tests for critical invariants: shared inventory, webhook idempotency, one ticket identity across QR/reference lookup, atomic redemption, whole-booking refunds, and role isolation.
