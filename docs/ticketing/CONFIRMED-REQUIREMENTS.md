# Artist Playground Ticketing — Confirmed Requirements

Last reviewed: 2026-11-27

This document records decisions explicitly confirmed for the Artist Playground ticketing platform. It is the source of truth for implementation until amended.

## Scope and website experience
- Ticket sales are for Artist Playground's own public productions.
- School educational productions are excluded from this ticketing workflow; schools/organizers manage their own student tickets.
- Ticketing must be part of the existing Artist Playground website, with one unified website experience and the same website origin.
- Do not create a separate ticketing website, subdomain, or separately branded frontend.
- Preserve the existing Astro website and visual identity; add ticketing routes without redesigning the marketing site.
- Use only the dedicated Artist Playground Supabase project for ticketing data, authentication, and backend functions.
- Do not use or modify Web2Table systems or databases.

## Sales channels and inventory
- Support online sales and physical box-office sales.
- Both channels use the same inventory.
- Use general admission only; no assigned seating or seat maps.
- A production can have multiple performances (dates/times); each performance has independent capacity and inventory.
- Each performance can have multiple ticket categories with their own prices and allocations, or a single category.
- The sum of category allocations must not exceed the performance capacity.
- Inventory changes and reservations must be concurrency-safe to prevent overselling.
- Maximum tickets per booking is configurable at the performance level.

## Purchaser and attendee details
- Guest checkout only; customers do not create accounts or sign in.
- One purchaser name and one purchaser email are collected per booking.
- For a multi-ticket booking, collect the full name and birthday of every attendee.
- One purchaser email receives all digital tickets for the booking.
- Each attendee receives an individual ticket.

## Ticket identity and delivery
- Every individual ticket has one unique human-readable reference number and one unique QR token encoded in its QR code.
- Both identifiers resolve to the same ticket record.
- One attendee = one ticket record = one QR code = one reference number.
- Tickets are digital and delivered by email only; no printed-ticket workflow.
- Email delivery failures are logged. Resending must not create duplicate tickets or invalidate existing tickets.

## Payments
- Online payment uses PayMongo Hosted Checkout.
- Payment processing fees are passed to the purchaser. The Artist Playground UI shows the ticket subtotal before redirect; PayMongo displays/calculates the method-specific fee after the customer selects a payment method. Do not estimate or hardcode that fee in the Artist Playground UI.
- Payment must be verified server-side using a verified PayMongo webhook and transaction checks. A browser return/success page is never proof of payment.
- Box-office cash: staff records receipt of cash; tickets are issued only after staff confirms the cash was received.
- Box-office digital payment: use PayMongo QR payment flow; payment is confirmed only through verified server-side webhook processing. Staff cannot manually mark digital payments as paid.
- Payment status and ticket status are tracked independently.
- Artist Playground's PayMongo merchant account is not yet confirmed; do not assume it is shared with Web2Table.

## Refunds
- Refund requests are reviewed at the company's discretion by staff.
- Refund handling is for the whole booking/transaction only; no partial refund for an individual ticket within a booking.
- If approved, all tickets in the booking are invalidated together.
- Record refund decisions/actions and reconcile them with the payment provider.

## Complimentary tickets and promotions
- Promotional discounts are at the company's discretion and are managed outside this ticketing system. Do not build discount-code or promotion-recording features.
- If the company gives complimentary tickets, staff adjusts the available capacity accordingly. There is no separate complimentary-ticket issuance workflow in the initial scope.

## Staff access and authentication
- One shared login gateway within the existing Artist Playground website.
- Two account roles: System Administrator and Staff.
- After login, users are routed to different views within the same website based on their assigned role.
- Role is assigned to the account and enforced by the backend; users do not choose their role at login.
- Staff is one simple role for everyone, including the CEO. No manager or separate CEO role.
- Staff handles day-to-day ticket sales, cash confirmation, refunds, booking lookup, and ticket scanning.
- System Administrator maintains the platform, staff accounts, system configuration, integrations, and technical operations.
- Essential backend safeguards (payment verification, ticket validation, audit records) apply regardless of role.

## Ticket validation
- Staff use a browser-based scanner on a dedicated staff page; no native mobile app is required.
- Scanner and manual reference-number lookup resolve to the same ticket record and run the same backend validation.
- Validation checks the correct performance, verified/settled payment, and unused ticket state.
- Duplicate and concurrent scans must not redeem a ticket twice.
- A refunded/cancelled ticket is invalid for admission.

## Temporary testing identity
- A user-provided email is reserved for temporary testing only.
- It must not be hardcoded in source code, migrations, seeds, or permanent configuration.
- No test account has been created yet. Provision it only when a safe supported staff-auth setup is ready, and remove it and related test data before production.

## Decisions still open
- Production/performance time zone and currency confirmation.
- Ticket category pricing and allocation management details beyond the confirmed model.
- Refund provider flow and exact refund reconciliation behavior.
- Email delivery provider and sender domain.
- Staff account provisioning and recovery process.
- PayMongo merchant onboarding and current supported QR/payment methods.
- Ticket reservation expiry and abandoned checkout behavior.
- Attendee birthday purpose, retention, access, and privacy notice.
- Scanner behavior during internet outages.
- Whether attendee names/birthdays can be edited after purchase and the support process for incorrect purchaser email.
- Final database schema and implementation sequencing.
