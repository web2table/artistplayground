import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, error: "Method not allowed." }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Ticket catalog is not configured.");
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("performances")
      .select("id, starts_at, venue_name, venue_address, status, productions!inner(title, slug, description, poster_url, status), ticket_categories(id, name, price, allocation, reserved_count, sold_count, sales_start_at, sales_end_at, active)")
      .eq("status", "scheduled")
      .eq("productions.status", "published")
      .gt("starts_at", now)
      .order("starts_at", { ascending: true });
    if (error) throw error;

    const performances = (data || []).map((row: any) => {
      const production = Array.isArray(row.productions) ? row.productions[0] : row.productions;
      const categories = (row.ticket_categories || [])
        .filter((category: any) => category.active
          && (!category.sales_start_at || category.sales_start_at <= now)
          && (!category.sales_end_at || category.sales_end_at > now))
        .map((category: any) => ({
          id: category.id,
          name: category.name,
          price: Number(category.price),
          remaining: Math.max(0, category.allocation - category.reserved_count - category.sold_count),
        }))
        .filter((category: any) => category.remaining > 0);
      return {
        id: row.id,
        starts_at: row.starts_at,
        venue_name: row.venue_name,
        venue_address: row.venue_address,
        production_title: production?.title || "Production",
        production_slug: production?.slug || "",
        description: production?.description || null,
        poster_url: production?.poster_url || null,
        categories,
      };
    }).filter((row: any) => row.categories.length > 0);

    return new Response(JSON.stringify({ ok: true, performances }), { status: 200, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("public-ticket-catalog error", error);
    return new Response(JSON.stringify({ ok: false, error: "Unable to load ticket availability right now." }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
