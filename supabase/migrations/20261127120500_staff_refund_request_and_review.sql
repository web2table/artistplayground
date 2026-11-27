create or replace function public.create_staff_refund_request(
  p_booking_reference text,
  p_payment_id uuid,
  p_reason text,
  p_actor uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_refund public.refunds%rowtype;
  v_profile public.staff_profiles%rowtype;
begin
  select * into v_profile from public.staff_profiles where user_id = p_actor and active = true;
  if not found or v_profile.role not in ('staff','system_admin') then raise exception 'Active staff access required'; end if;
  if length(trim(coalesce(p_reason,''))) < 5 or length(trim(p_reason)) > 1000 then raise exception 'Provide a refund reason between 5 and 1000 characters'; end if;
  select * into v_booking from public.bookings where booking_reference = upper(trim(p_booking_reference)) for update;
  if not found then raise exception 'Booking not found'; end if;
  select * into v_payment from public.payments where id = p_payment_id and booking_id = v_booking.id for update;
  if not found then raise exception 'Payment does not belong to this booking'; end if;
  if v_payment.status <> 'paid' then raise exception 'Only verified paid transactions can be refunded'; end if;
  if exists(select 1 from public.refunds where booking_id = v_booking.id) then raise exception 'A refund request already exists for this booking'; end if;
  insert into public.refunds(booking_id,payment_id,status,amount,reason,requested_by)
  values(v_booking.id,v_payment.id,'requested',v_payment.amount,trim(p_reason),p_actor)
  returning * into v_refund;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(p_actor,'refund_requested','refund',v_refund.id::text,jsonb_build_object('booking_reference',v_booking.booking_reference,'payment_id',v_payment.id,'amount',v_payment.amount,'currency',v_payment.currency));
  return jsonb_build_object('ok',true,'refund_id',v_refund.id,'status',v_refund.status,'amount',v_refund.amount,'currency',v_payment.currency);
end;
$$;

create or replace function public.review_staff_refund_request(
  p_refund_id uuid,
  p_decision text,
  p_actor uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.staff_profiles%rowtype;
  v_refund public.refunds%rowtype;
  v_booking public.bookings%rowtype;
begin
  select * into v_profile from public.staff_profiles where user_id = p_actor and active = true;
  if not found or v_profile.role <> 'system_admin' then raise exception 'System Admin access required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
  select * into v_refund from public.refunds where id = p_refund_id for update;
  if not found then raise exception 'Refund request not found'; end if;
  if v_refund.status <> 'requested' then raise exception 'Only pending requests can be reviewed'; end if;
  update public.refunds set status = p_decision::public.refund_status, reviewed_by = p_actor, reviewed_at = now()
  where id = p_refund_id returning * into v_refund;
  select * into v_booking from public.bookings where id = v_refund.booking_id;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(p_actor,'refund_'||p_decision,'refund',v_refund.id::text,jsonb_build_object('booking_reference',v_booking.booking_reference,'amount',v_refund.amount));
  return jsonb_build_object('ok',true,'refund_id',v_refund.id,'status',v_refund.status);
end;
$$;

revoke all on function public.create_staff_refund_request(text,uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.review_staff_refund_request(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.create_staff_refund_request(text,uuid,text,uuid) to service_role;
grant execute on function public.review_staff_refund_request(uuid,text,uuid) to service_role;
