import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST") return json({error:"Method not allowed."},405);
 const authorization=req.headers.get("Authorization")??"";
 const token=authorization.replace(/^Bearer\s+/i,"");
 if(!token||token===authorization) return json({error:"Unauthorized."},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service) return json({error:"Server configuration is incomplete."},500);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:userData,error:userError}=await auth.auth.getUser(token);
 if(userError||!userData.user) return json({error:"Unauthorized."},401);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await db.from("staff_profiles").select("role,active").eq("user_id",userData.user.id).maybeSingle();
 if(profileError) return json({error:"Unable to verify staff access."},500);
 if(!profile?.active||!["staff","system_admin"].includes(profile.role)) return json({error:"An active staff account is required."},403);
 let body:{action?:string;booking_reference?:string;payment_id?:string;reason?:string;refund_id?:string;decision?:string};
 try{body=await req.json();}catch{return json({error:"Invalid request body."},400);}
 if(body.action==="list"){
   const {data,error}=await db.from("refunds").select("id,booking_id,payment_id,status,amount,reason,provider_reference,requested_by,reviewed_by,reviewed_at,completed_at,created_at,bookings!inner(booking_reference,purchaser_name,purchaser_email,status),payments!inner(method,provider,status,currency,provider_reference)").order("created_at",{ascending:false}).limit(200);
   if(error)return json({error:"Unable to load refund requests."},500);
   await db.from("audit_logs").insert({actor_user_id:userData.user.id,action:"staff_refund_desk_view",entity_type:"refund",details:{returned:(data??[]).length}});
   return json({ok:true,role:profile.role,refunds:(data??[]).map((r:any)=>({id:r.id,booking_reference:r.bookings.booking_reference,purchaser_name:r.bookings.purchaser_name,purchaser_email:r.bookings.purchaser_email,booking_status:r.bookings.status,payment_method:r.payments.method,provider:r.payments.provider,payment_status:r.payments.status,currency:r.payments.currency,provider_reference:r.payments.provider_reference,amount:r.amount,status:r.status,reason:r.reason,requested_at:r.created_at,reviewed_at:r.reviewed_at,completed_at:r.completed_at}))});
 }
 if(body.action==="request"){
   if(typeof body.booking_reference!=="string"||typeof body.payment_id!=="string"||typeof body.reason!=="string")return json({error:"Booking, payment, and reason are required."},400);
   const {data,error}=await db.rpc("create_staff_refund_request",{p_booking_reference:body.booking_reference,p_payment_id:body.payment_id,p_reason:body.reason,p_actor:userData.user.id});
   if(error)return json({error:error.message||"Unable to submit refund request."},400);
   return json(data as Record<string,unknown>);
 }
 if(body.action==="review"){
   if(profile.role!=="system_admin")return json({error:"System Admin access required."},403);
   if(typeof body.refund_id!=="string"||!["approved","rejected"].includes(body.decision??""))return json({error:"A refund request and valid decision are required."},400);
   const {data,error}=await db.rpc("review_staff_refund_request",{p_refund_id:body.refund_id,p_decision:body.decision,p_actor:userData.user.id});
   if(error)return json({error:error.message||"Unable to review refund request."},400);
   return json(data as Record<string,unknown>);
 }
 return json({error:"Unsupported refund action."},400);
});