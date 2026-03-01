import { createClient } from "npm:@supabase/supabase-js@2.98.0";
import bcrypt from "npm:bcryptjs@2.4.3";

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
    const pathMatch = url.pathname.match(/\/users\/(\d+)$/);

    if (req.method === "GET") {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, username, role");

      if (error) throw error;

      return new Response(JSON.stringify(users || []), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { username, password, role } = await req.json();

      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: user, error } = await supabase
        .from("users")
        .insert([{ username, password: hashedPassword, role }])
        .select("id, username, role")
        .single();

      if (error) {
        if (error.message.includes("duplicate")) {
          return new Response(
            JSON.stringify({ error: "El usuario ya existe" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        throw error;
      }

      return new Response(JSON.stringify(user), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE" && pathMatch) {
      const id = pathMatch[1];

      const { error } = await supabase
        .from("users")
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
    console.error("Users API error:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
