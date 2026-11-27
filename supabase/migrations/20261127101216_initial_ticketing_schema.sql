create extension if not exists pgcrypto;

create type public.staff_role as enum ('staff', 'system_admin');
create type public.production_status as enum ('draft', 'published', 'archived');
create type public.performance_status as enum ('scheduled', 'cancelled', 'completed');
create type public.booking_status as enum ('pending_payment', 'confirmed', 'cancelled', 'expired', 'refunded');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'cancelled', 'refunded');
create type public.payment_method as enum ('paymongo', 'cash');
create type public.ticket_status as enum ('issued', 'redeemed', 'cancelled', 'refunded');
create type public.refund_status as enum ('requested', 'approved', 'rejected', 'processing', 'succeeded', 'failed');

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role public.staff_role not null default 'staff',
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_display_name_nonempty check (length(trim(display_name)) > 0)
);

create table public.productions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  poster_url text,
  status public.production_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint production_title_nonempty check (length(trim(title)) > 0)
);

create table public.performances (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete restrict,
  starts_at timestamptz not null,
  doors_open_at timestamptz,
  venue_name text not null,
  venue_address text,
  capacity integer not null check (capacity > 0),
  status public.performance_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doors_before_show check (doors_open_at is null or doors_open_at <= starts_at),
  constraint venue_name_nonempty check (length(trim(venue_name)) > 0)
);
create index performances_production_starts_idx on public.performances(production_id, starts_at);

create table public.ticket_categories (
  id uuid primary key default gen_random_uuid(),
  performance_id uuid not null references public.performances(id) on delete restrict,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  allocation integer not null check (allocation > 0),
  reserved_count integer not null default 0 check (reserved_count >= 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_name_nonempty check (length(trim(name)) > 0),
  constraint category_inventory_within_allocation check (reserved_count + sold_count <= allocation),
  constraint category_sales_window check (sales_end_at is null or sales_start_at is null or sales_end_at > sales_start_at),
  unique (performance_id, name)
);
create index ticket_categories_performance_idx on public.ticket_categories(performance_id);

create function public.enforce_category_allocation_total()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  performance_capacity integer;
  allocated_total integer;
begin
  select p.capacity into performance_capacity
  from public.performances p
  where p.id = new.performance_id
  for update;

  if not found then
    raise exception 'Performance does not exist';
  end if;

  select coalesce(sum(tc.allocation), 0) into allocated_total
  from public.ticket_categories tc
  where tc.performance_id = new.performance_id
    and tc.id is distinct from new.id;

  if allocated_total + new.allocation > performance_capacity then
    raise exception 'Ticket category allocations (%) exceed performance capacity (%)',
      allocated_total + new.allocation, performance_capacity;
  end if;

  return new;
end;
$$;

create trigger ticket_category_allocation_guard
before insert or update of performance_id, allocation
on public.ticket_categories
for each row execute function public.enforce_category_allocation_total();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  purchaser_name text not null,
  purchaser_email text not null,
  status public.booking_status not null default 'pending_payment',
  currency char(3) not null default 'PHP' check (currency = 'PHP'),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  max_tickets_snapshot integer not null check (max_tickets_snapshot > 0),
  expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchaser_name_nonempty check (length(trim(purchaser_name)) > 0),
  constraint purchaser_email_basic_format check (purchaser_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'),
  constraint booking_total_not_below_subtotal check (total_amount >= subtotal)
);
create index bookings_email_created_idx on public.bookings(lower(purchaser_email), created_at desc);
create index bookings_status_created_idx on public.bookings(status, created_at desc);

create table public.attendees (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  full_name text not null,
  birth_date date not null,
  created_at timestamptz not null default now(),
  constraint attendee_name_nonempty check (length(trim(full_name)) > 0)
);
create index attendees_booking_idx on public.attendees(booking_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  provider text not null,
  provider_reference text,
  checkout_url text,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'PHP' check (currency = 'PHP'),
  verified_at timestamptz,
  failure_reason text,
  idempotency_key text not null unique,
  provider_payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_provider_nonempty check (length(trim(provider)) > 0)
);
create unique index payments_provider_reference_uidx on public.payments(provider, provider_reference) where provider_reference is not null;
create index payments_booking_created_idx on public.payments(booking_id, created_at desc);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  attendee_id uuid not null unique references public.attendees(id) on delete restrict,
  performance_id uuid not null references public.performances(id) on delete restrict,
  ticket_category_id uuid not null references public.ticket_categories(id) on delete restrict,
  ticket_reference text not null unique,
  qr_token_hash text not null unique,
  status public.ticket_status not null default 'issued',
  issued_at timestamptz not null default now(),
  redeemed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index tickets_performance_status_idx on public.tickets(performance_id, status);
create index tickets_booking_idx on public.tickets(booking_id);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  status public.refund_status not null default 'requested',
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  provider_reference text,
  requested_by uuid references public.staff_profiles(user_id) on delete set null,
  reviewed_by uuid references public.staff_profiles(user_id) on delete set null,
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint refund_reason_nonempty check (length(trim(reason)) > 0),
  unique (booking_id)
);

create table public.ticket_scans (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  scanned_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  scan_result text not null check (scan_result in ('accepted', 'already_redeemed', 'cancelled', 'refunded', 'wrong_performance', 'unpaid')),
  scanned_at timestamptz not null default now(),
  device_label text
);
create index ticket_scans_ticket_time_idx on public.ticket_scans(ticket_id, scanned_at desc);

create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  recipient_email text not null,
  provider text not null,
  provider_message_id text,
  status text not null check (status in ('queued', 'sent', 'delivered', 'bounced', 'failed')),
  attempt_number integer not null check (attempt_number > 0),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id, attempt_number)
);
create index email_deliveries_booking_idx on public.email_deliveries(booking_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.staff_profiles(user_id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_action_nonempty check (length(trim(action)) > 0),
  constraint audit_entity_type_nonempty check (length(trim(entity_type)) > 0)
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index audit_logs_actor_time_idx on public.audit_logs(actor_user_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'staff_profiles','productions','performances','ticket_categories','bookings',
    'attendees','payments','tickets','refunds','ticket_scans','email_deliveries','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end;
$$;

revoke all on function public.enforce_category_allocation_total() from public, anon, authenticated;
