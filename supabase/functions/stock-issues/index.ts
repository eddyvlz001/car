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
    const pathMatch = url.pathname.match(/\/stock-issues\/(\d+)$/);

    if (req.method === "GET" && url.pathname === "/stock-issues") {
      const { data: issues, error } = await supabase
        .from("stock_issues")
        .select("*")
        .order("reported_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(issues || []), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && url.pathname === "/stock-issues") {
      const { item_name, issue_type } = await req.json();

      const { error: insertError } = await supabase
        .from("stock_issues")
        .insert([{ item_name, issue_type }]);

      if (insertError) throw insertError;

      const { data: issues, error: fetchError } = await supabase
        .from("stock_issues")
        .select("*");

      if (fetchError) throw fetchError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE" && pathMatch) {
      const id = pathMatch[1];

      const { error: deleteError } = await supabase
        .from("stock_issues")
        .delete()
        .eq("id", parseInt(id));

      if (deleteError) throw deleteError;

      const { data: issues, error: fetchError } = await supabase
        .from("stock_issues")
        .select("*");

      if (fetchError) throw fetchError;

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
    console.error("Stock issues API error:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
