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
    const statusMatch = url.pathname.match(/\/routes\/(\d+)\/status$/);
    const batchMatch = url.pathname.match(/\/routes\/batch-status$/);

    if (req.method === "GET" && url.pathname === "/routes") {
      const { data: routes, error } = await supabase
        .from("routes")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(routes || []), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && statusMatch) {
      const id = statusMatch[1];
      const { status, driver_name, preparer_name } = await req.json();

      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (driver_name) updateData.driver_name = driver_name;
      if (preparer_name) updateData.preparer_name = preparer_name;

      const { data: updatedRoute, error } = await supabase
        .from("routes")
        .update(updateData)
        .eq("id", parseInt(id))
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(updatedRoute), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && batchMatch) {
      const { ids, status, driver_name, preparer_name } = await req.json();

      if (!ids || ids.length === 0) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (driver_name) updateData.driver_name = driver_name;
      if (preparer_name) updateData.preparer_name = preparer_name;

      const { data: updatedRoutes, error } = await supabase
        .from("routes")
        .update(updateData)
        .in("id", ids)
        .select();

      if (error) throw error;

      return new Response(JSON.stringify(updatedRoutes || []), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Routes API error:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
