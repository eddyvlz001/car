import { createClient } from "npm:@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const resolveMatch = url.pathname.match(/\/requests\/(\d+)\/resolve$/);

    if (req.method === "GET" && url.pathname === "/requests") {
      const { data: requests, error } = await supabase
        .from("carpet_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(requests || []), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && url.pathname === "/requests") {
      const { route_id, details, driver_name } = await req.json();

      const { data: route, error: routeError } = await supabase
        .from("routes")
        .select("day_of_week, priority_number")
        .eq("id", route_id)
        .single();

      if (routeError) throw routeError;

      const { data: newRequest, error } = await supabase
        .from("carpet_requests")
        .insert([{
          route_id,
          details,
          driver_name,
          day_of_week: route?.day_of_week || "",
          priority_number: route?.priority_number || 0
        }])
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(newRequest), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && resolveMatch) {
      const id = resolveMatch[1];

      const { error } = await supabase
        .from("carpet_requests")
        .delete()
        .eq("id", parseInt(id));

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Requests API error:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
