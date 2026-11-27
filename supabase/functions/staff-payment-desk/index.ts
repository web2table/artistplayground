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
 let body:{action?:string;status?:string;method?:string;limit?:number};
 try{body=await req.json();}catch{return json({error:"Invalid request body."},400);}
 if(body.action!=="list") return json({error:"Unsupported payment desk action."},400);
 const allowedStatuses=["pending","paid","failed","cancelled","refunded"];
 if(body.status&&!allowedStatuses.includes(body.status)) return json({error:"Invalid payment status filter."},400);
 if(body.method&&!["cash","paymongo"].includes(body.method)) return json({error:"Invalid payment method filter."},400);
 const limit=Math.min(Math.max(Number(body.limit)||100,1),200);
 let query=db.from("payments").select("id,booking_id,method,status,provider,provider_reference,amount,currency,verified_at,failure_reason,created_at,bookings!inner(booking_reference,purchaser_name,purchaser_email,status)").order("created_at",{ascending:false}).limit(limit);
 if(body.status) query=query.eq("status",body.status);
 if(body.method) query=query.eq("method",body.method);
 const {data,error}=await query;
 if(error) return json({error:"Unable to load payment records."},500);
 const rows=(data??[]).map((p:any)=>({id:p.id,booking_reference:p.bookings.booking_reference,purchaser_name:p.bookings.purchaser_name,purchaser_email:p.bookings.purchaser_email,booking_status:p.bookings.status,method:p.method,status:p.status,provider:p.provider,provider_reference:p.provider_reference,amount:p.amount,currency:p.currency,verified_at:p.verified_at,failure_reason:p.failure_reason,created_at:p.created_at}));
 const totals=rows.reduce((acc:any,p:any)=>{acc.count++;acc[p.status]=(acc[p.status]??0)+1;if(p.status==="paid")acc.paid_amount+=Number(p.amount);return acc;},{count:0,pending:0,paid:0,failed:0,cancelled:0,refunded:0,paid_amount:0});
 await db.from("audit_logs").insert({actor_user_id:userData.user.id,action:"staff_payment_desk_view",entity_type:"payment",details:{status:body.status??"all",method:body.method??"all",returned:rows.length}});
 return json({ok:true,payments:rows,totals});
});