create index payments_created_by_idx on public.payments(created_by);
create index productions_created_by_idx on public.productions(created_by);
create index refunds_payment_id_idx on public.refunds(payment_id);
create index refunds_requested_by_idx on public.refunds(requested_by);
create index refunds_reviewed_by_idx on public.refunds(reviewed_by);
create index ticket_scans_scanned_by_idx on public.ticket_scans(scanned_by);
create index tickets_ticket_category_id_idx on public.tickets(ticket_category_id);

create or replace function public.enforce_performance_capacity_not_below_allocations()
returns trigger
language plpgsql
set search_path = ''
as $$
declare allocated_total integer;
begin
  if new.capacity < old.capacity then
    select coalesce(sum(tc.allocation), 0) into allocated_total
    from public.ticket_categories tc
    where tc.performance_id = old.id;

    if allocated_total > new.capacity then
      raise exception 'Performance capacity (%) cannot be lower than current ticket allocations (%)',
        new.capacity, allocated_total;
    end if;
  end if;
  return new;
end;
$$;

create trigger performance_capacity_guard
before update of capacity on public.performances
for each row execute function public.enforce_performance_capacity_not_below_allocations();

revoke all on function public.enforce_performance_capacity_not_below_allocations() from public, anon, authenticated;
