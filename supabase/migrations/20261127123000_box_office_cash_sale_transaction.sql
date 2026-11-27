create or replace function public.create_box_office_cash_sale(
  p_staff_id uuid, p_purchaser_name text, p_purchaser_email text, p_items jsonb, p_idempotency_key text, p_ticket_tokens jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_booking_id uuid := gen_random_uuid();
  v_booking_reference text := 'AP-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
  v_subtotal numeric(12,2) := 0; v_ticket_count integer := 0; v_token_index integer := 0;
  v_item jsonb; v_attendee jsonb; v_category record; v_performance record;
  v_attendee_id uuid; v_ticket_reference text; v_qr_hash text; v_token jsonb;
  v_payment_id uuid := gen_random_uuid(); v_now timestamptz := now();
begin
  if p_staff_id is null or length(trim(coalesce(p_purchaser_name,''))) = 0 or length(trim(coalesce(p_purchaser_email,''))) = 0
     or p_idempotency_key is null or length(trim(p_idempotency_key)) < 12 or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_typeof(p_ticket_tokens) <> 'array' then raise exception 'Invalid cash sale details'; end if;
  if not exists (select 1 from public.staff_profiles sp where sp.user_id=p_staff_id and sp.active and sp.role in ('staff','system_admin')) then raise exception 'Active staff account required'; end if;
  if exists (select 1 from public.payments where idempotency_key=p_idempotency_key) then raise exception 'This cash sale was already submitted'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item->'attendees') <> 'array' or jsonb_array_length(v_item->'attendees')=0 then raise exception 'Each ticket category needs at least one attendee'; end if;
    select tc.* into v_category from public.ticket_categories tc join public.performances p on p.id=tc.performance_id join public.productions pr on pr.id=p.production_id where tc.id=(v_item->>'category_id')::uuid and tc.active and p.status='scheduled' and pr.status='published' for update of tc;
    if not found then raise exception 'Ticket category is unavailable'; end if;
    select * into v_performance from public.performances where id=v_category.performance_id for update;
    if v_performance.starts_at<=v_now then raise exception 'This performance is no longer available for sale'; end if;
    if v_category.sales_start_at is not null and v_category.sales_start_at>v_now then raise exception 'Ticket sales have not opened'; end if;
    if v_category.sales_end_at is not null and v_category.sales_end_at<=v_now then raise exception 'Ticket sales have closed'; end if;
    if v_category.allocation-v_category.reserved_count-v_category.sold_count<jsonb_array_length(v_item->'attendees') then raise exception 'Not enough tickets remain in category %',v_category.name; end if;
    v_subtotal:=v_subtotal+(v_category.price*jsonb_array_length(v_item->'attendees')); v_ticket_count:=v_ticket_count+jsonb_array_length(v_item->'attendees');
  end loop;
  if v_ticket_count>20 then raise exception 'A box-office sale cannot exceed 20 tickets'; end if;
  if jsonb_array_length(p_ticket_tokens)<>v_ticket_count then raise exception 'Ticket token count does not match ticket count'; end if;
  insert into public.bookings(id,booking_reference,purchaser_name,purchaser_email,status,currency,subtotal,total_amount,max_tickets_snapshot,confirmed_at,created_at,updated_at) values(v_booking_id,v_booking_reference,trim(p_purchaser_name),lower(trim(p_purchaser_email)),'confirmed','PHP',v_subtotal,v_subtotal,20,v_now,v_now,v_now);
  insert into public.payments(id,booking_id,method,status,provider,amount,currency,verified_at,idempotency_key,created_by,created_at,updated_at) values(v_payment_id,v_booking_id,'cash','paid','box_office_cash',v_subtotal,'PHP',v_now,p_idempotency_key,p_staff_id,v_now,v_now);
  for v_item in select value from jsonb_array_elements(p_items) loop
    select tc.* into v_category from public.ticket_categories tc where tc.id=(v_item->>'category_id')::uuid for update;
    update public.ticket_categories set sold_count=sold_count+jsonb_array_length(v_item->'attendees'),updated_at=v_now where id=v_category.id;
    for v_attendee in select value from jsonb_array_elements(v_item->'attendees') loop
      if length(trim(coalesce(v_attendee->>'full_name','')))=0 or coalesce(v_attendee->>'birth_date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Each attendee needs a full name and valid birth date'; end if;
      insert into public.attendees(booking_id,full_name,birth_date) values(v_booking_id,trim(v_attendee->>'full_name'),(v_attendee->>'birth_date')::date) returning id into v_attendee_id;
      v_token:=p_ticket_tokens->v_token_index; v_token_index:=v_token_index+1; v_ticket_reference:=v_token->>'ticket_reference'; v_qr_hash:=v_token->>'qr_token_hash';
      if v_ticket_reference is null or v_qr_hash is null then raise exception 'Ticket token details are invalid'; end if;
      insert into public.tickets(booking_id,attendee_id,performance_id,ticket_category_id,ticket_reference,qr_token_hash,status,issued_at) values(v_booking_id,v_attendee_id,v_category.performance_id,v_category.id,v_ticket_reference,v_qr_hash,'issued',v_now);
    end loop;
  end loop;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,details) values(p_staff_id,'box_office_cash_sale_created','booking',v_booking_id::text,jsonb_build_object('booking_reference',v_booking_reference,'ticket_count',v_ticket_count,'amount',v_subtotal,'payment_method','cash'));
  return jsonb_build_object('booking_id',v_booking_id,'booking_reference',v_booking_reference,'payment_id',v_payment_id,'ticket_count',v_ticket_count,'subtotal',v_subtotal,'currency','PHP');
end; $$;
revoke all on function public.create_box_office_cash_sale(uuid,text,text,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_box_office_cash_sale(uuid,text,text,jsonb,text,jsonb) to service_role;
