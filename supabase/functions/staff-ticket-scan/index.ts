import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
async function sha256(value:string):Promise<string>{const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");}
function normalizeCredential(value:string){return /^[A-Za-z0-9-]{4,40}$/.test(value)?value.toUpperCase():null;}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 const authorization=req.headers.get("Authorization")??"";const token=authorization.replace(/^Bearer\s+/i,"");if(!token||token===authorization)return json({error:"Unauthorized."},401);
 const url=Deno.env.get("SUPABASE_URL"),anonKey=Deno.env.get("SUPABASE_ANON_KEY"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!anonKey||!serviceKey)return json({error:"Server configuration is incomplete."},500);
 const auth=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});const {data:authData,error:authError}=await auth.auth.getUser(token);if(authError||!authData.user)return json({error:"Unauthorized."},401);
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});const {data:profile,error:profileError}=await db.from("staff_profiles").select("role,active").eq("user_id",authData.user.id).maybeSingle();
 if(profileError)return json({error:"Unable to verify staff access."},500);if(!profile?.active||!["staff","system_admin"].includes(profile.role))return json({error:"An active staff account is required."},403);
 let body:{action?:string;credential?:string;device_label?:string};try{body=await req.json();}catch{return json({error:"Invalid request body."},400);}
 const credential=typeof body.credential==="string"?body.credential.trim():"";if(!credential||credential.length>512)return json({error:"Scan a ticket QR code or enter its ticket reference."},400);
 const reference=normalizeCredential(credential),lookupCredential=reference??await sha256(credential);
 const ticketQuery=db.from("tickets").select("id,ticket_reference,status,booking_id,attendee_id,performance_id,ticket_category_id");
 const {data:ticket,error:ticketError}=reference?await ticketQuery.eq("ticket_reference",reference).maybeSingle():await ticketQuery.eq("qr_token_hash",lookupCredential).maybeSingle();
 if(ticketError)return json({error:"Unable to look up this ticket."},500);if(!ticket)return json({ok:true,result:"not_found",message:"Ticket not found. Check the QR code or ticket reference."});
 if(body.action==="deny_entry"){
  const {error:scanError}=await db.from("ticket_scans").insert({ticket_id:ticket.id,scanned_by:authData.user.id,scan_result:"denied",device_label:typeof body.device_label==="string"?body.device_label.slice(0,100):"Staff scanner"});
  if(scanError){console.error("Denied entry scan could not be recorded",scanError);return json({error:"Unable to record the denied entry. Please try again."},500);}
  const {error:auditError}=await db.from("audit_logs").insert({actor_user_id:authData.user.id,action:"ticket_entry_denied",entity_type:"ticket",entity_id:ticket.id.toString(),details:{ticket_reference:ticket.ticket_reference,performance_id:ticket.performance_id,reason:"Denied by staff discretion"}});
  if(auditError)console.error("Denied entry audit log failed",auditError);
  return json({ok:true,result:"denied",message:"Entry denied by staff. The ticket remains valid for its assigned show.",ticket_reference:ticket.ticket_reference});
 }
 if(body.action==="clock_in"){
  const {data,error}=await db.rpc("redeem_ticket_for_staff",{p_staff_user_id:authData.user.id,p_credential:reference??lookupCredential,p_performance_id:ticket.performance_id,p_device_label:typeof body.device_label==="string"?body.device_label.slice(0,100):"Staff scanner"});
  if(error){console.error("Ticket clock-in failed",error);return json({error:"Unable to record admission. Please try again."},500);}return json(data as Record<string,unknown>);
 }
 const [attendeeResult,categoryResult,performanceResult,bookingResult,paymentResult]=await Promise.all([
  db.from("attendees").select("full_name,birth_date").eq("id",ticket.attendee_id).maybeSingle(),
  db.from("ticket_categories").select("name").eq("id",ticket.ticket_category_id).maybeSingle(),
  db.from("performances").select("starts_at,venue_name,status,productions!inner(title)").eq("id",ticket.performance_id).maybeSingle(),
  db.from("bookings").select("status").eq("id",ticket.booking_id).maybeSingle(),
  db.from("payments").select("status").eq("booking_id",ticket.booking_id)
 ]);
 if(attendeeResult.error||categoryResult.error||performanceResult.error||bookingResult.error||paymentResult.error){console.error("Ticket detail lookup failed",{attendeeResult,categoryResult,performanceResult,bookingResult,paymentResult});return json({error:"Unable to load ticket details."},500);}
 const attendee=attendeeResult.data,category=categoryResult.data,performance:any=performanceResult.data,booking=bookingResult.data,paid=(paymentResult.data??[]).some((p:any)=>p.status==="paid");
 let result="ready",message="Ticket verified. Confirm the attendee details, then clock them in.";
 if(ticket.status==="redeemed"){result="already_redeemed";message="This ticket has already been used.";}
 else if(ticket.status==="cancelled"||booking?.status==="cancelled"){result="cancelled";message="This ticket or booking has been cancelled.";}
 else if(ticket.status==="refunded"||booking?.status==="refunded"){result="refunded";message="This ticket or booking has been refunded.";}
 else if(booking?.status!=="confirmed"||!paid){result="unpaid";message="Payment is not confirmed. Do not admit this ticket.";}
 else if(ticket.status!=="issued"){result="invalid";message="This ticket is not valid for admission.";}
 return json({ok:true,result,message,ticket_reference:ticket.ticket_reference,ticket_status:ticket.status,attendee_name:attendee?.full_name??"Unknown attendee",birth_date:attendee?.birth_date??null,ticket_category:category?.name??"Unknown category",production_title:performance?.productions?.title??"Production",starts_at:performance?.starts_at??null,venue_name:performance?.venue_name??null,performance_status:performance?.status??null});
});