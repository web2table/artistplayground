alter table public.tickets
  add column if not exists qr_token_ciphertext text,
  add column if not exists qr_token_iv text;

alter table public.email_deliveries
  add column if not exists request_key text;

create unique index if not exists email_deliveries_request_key_uidx
  on public.email_deliveries(request_key)
  where request_key is not null;

create or replace function public.begin_ticket_email_delivery(
  p_booking_reference text, p_recipient_email text, p_request_key text, p_actor uuid
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_delivery public.email_deliveries%rowtype;
  v_attempt integer;
begin
  if p_actor is null or p_request_key is null or length(trim(p_request_key)) < 12 or length(p_request_key) > 100 then
    raise exception 'Invalid email delivery request';
  end if;
  if not exists (select 1 from public.staff_profiles sp where sp.user_id=p_actor and sp.active and sp.role in ('staff','system_admin')) then
    raise exception 'An active staff account is required';
  end if;
  select * into v_booking from public.bookings where booking_reference=upper(trim(p_booking_reference)) for update;
  if not found then raise exception 'Booking not found'; end if;
  select * into v_delivery from public.email_deliveries where request_key=p_request_key;
  if found then
    if v_delivery.booking_id<>v_booking.id then raise exception 'Request key is already used'; end if;
    return jsonb_build_object('delivery_id',v_delivery.id,'attempt_number',v_delivery.attempt_number,'status',v_delivery.status,'existing',true);
  end if;
  if v_booking.status<>'confirmed' then raise exception 'Only confirmed bookings can receive tickets'; end if;
  if not exists (select 1 from public.payments p where p.booking_id=v_booking.id and p.status='paid') then raise exception 'Payment is not confirmed'; end if;
  if not exists (select 1 from public.tickets t where t.booking_id=v_booking.id and t.status in ('issued','redeemed')) then raise exception 'No valid tickets found'; end if;
  if exists (select 1 from public.tickets t where t.booking_id=v_booking.id and t.status in ('issued','redeemed') and (t.qr_token_ciphertext is null or t.qr_token_iv is null)) then
    raise exception 'One or more tickets do not have recoverable QR credentials; contact support';
  end if;
  if p_recipient_email is null or length(trim(p_recipient_email))=0 then raise exception 'Recipient email is required'; end if;
  select coalesce(max(ed.attempt_number),0)+1 into v_attempt from public.email_deliveries ed where ed.booking_id=v_booking.id;
  insert into public.email_deliveries(booking_id,recipient_email,provider,status,attempt_number,request_key)
  values(v_booking.id,lower(trim(p_recipient_email)),'resend','queued',v_attempt,p_request_key)
  returning * into v_delivery;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(p_actor,'ticket_email_queued','booking',v_booking.id::text,jsonb_build_object('booking_reference',v_booking.booking_reference,'delivery_id',v_delivery.id,'attempt_number',v_attempt));
  return jsonb_build_object('delivery_id',v_delivery.id,'attempt_number',v_attempt,'status',v_delivery.status,'existing',false);
end;
$$;

revoke all on function public.begin_ticket_email_delivery(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.begin_ticket_email_delivery(text,text,text,uuid) to service_role;
