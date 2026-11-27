create or replace function public.redeem_ticket_for_staff(
  p_staff_user_id uuid,
  p_credential text,
  p_performance_id uuid,
  p_device_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets%rowtype;
  v_booking public.bookings%rowtype;
  v_result text;
  v_paid boolean;
begin
  if p_staff_user_id is null or p_credential is null or length(trim(p_credential)) = 0 or p_performance_id is null then
    raise exception 'Staff, credential, and performance are required';
  end if;

  if not exists (
    select 1 from public.staff_profiles sp
    where sp.user_id = p_staff_user_id and sp.active = true
      and sp.role in ('staff'::public.staff_role, 'system_admin'::public.staff_role)
  ) then
    raise exception 'An active staff account is required';
  end if;

  select t.* into v_ticket
  from public.tickets t
  where t.ticket_reference = upper(trim(p_credential))
     or t.qr_token_hash = p_credential
  for update;

  if not found then
    return jsonb_build_object('ok', true, 'result', 'not_found', 'message', 'Ticket not found. Check the reference or QR code.');
  end if;

  select b.* into v_booking from public.bookings b where b.id = v_ticket.booking_id;
  select exists (
    select 1 from public.payments p
    where p.booking_id = v_ticket.booking_id and p.status = 'paid'::public.payment_status
  ) into v_paid;

  if v_ticket.status = 'refunded' or v_booking.status = 'refunded' then
    v_result := 'refunded';
  elsif v_ticket.status = 'cancelled' or v_booking.status = 'cancelled' then
    v_result := 'cancelled';
  elsif v_ticket.performance_id <> p_performance_id then
    v_result := 'wrong_performance';
  elsif v_booking.status <> 'confirmed' or not v_paid then
    v_result := 'unpaid';
  elsif v_ticket.status = 'redeemed' then
    v_result := 'already_redeemed';
  else
    update public.tickets
      set status = 'redeemed'::public.ticket_status, redeemed_at = now()
      where id = v_ticket.id;
    v_result := 'accepted';
  end if;

  insert into public.ticket_scans(ticket_id, scanned_by, scan_result, device_label)
  values (v_ticket.id, p_staff_user_id, v_result, nullif(left(trim(coalesce(p_device_label, '')), 100), ''));

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, details)
  values (p_staff_user_id, 'ticket_scan_' || v_result, 'ticket', v_ticket.id::text,
    jsonb_build_object('ticket_reference', v_ticket.ticket_reference, 'performance_id', p_performance_id));

  return jsonb_build_object(
    'ok', true,
    'result', v_result,
    'ticket_reference', v_ticket.ticket_reference,
    'attendee_name', (select a.full_name from public.attendees a where a.id = v_ticket.attendee_id),
    'message', case v_result
      when 'accepted' then 'Ticket accepted. Admission recorded.'
      when 'already_redeemed' then 'This ticket has already been used.'
      when 'cancelled' then 'This ticket or booking has been cancelled.'
      when 'refunded' then 'This ticket or booking has been refunded.'
      when 'wrong_performance' then 'This ticket is for a different performance.'
      when 'unpaid' then 'Payment is not confirmed. Do not admit this ticket.'
      else 'Ticket could not be validated.'
    end
  );
end;
$$;

revoke all on function public.redeem_ticket_for_staff(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_ticket_for_staff(uuid, text, uuid, text) to service_role;