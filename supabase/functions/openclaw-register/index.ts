import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { webhookUrl, webhookToken } = await req.json();

    if (!webhookUrl || !webhookToken) {
      return new Response(
        JSON.stringify({ error: "webhookUrl and webhookToken are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid webhook URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ping the OpenClaw instance to verify connectivity
    let reachable = false;
    try {
      const pingRes = await fetch(`${webhookUrl}/hooks/wake`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${webhookToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: "Dance OpenClaw connection test", mode: "now" }),
        signal: AbortSignal.timeout(10000),
      });
      reachable = pingRes.ok || pingRes.status === 202;
    } catch {
      // Instance not reachable — still save as pending
    }

    const status = reachable ? "connected" : "pending";

    // Get user's agent
    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", userId)
      .single();

    // Use service role client for upsert to bypass potential RLS issues on upsert conflict
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await serviceClient
      .from("openclaw_connections")
      .upsert(
        {
          user_id: userId,
          agent_id: agent?.id ?? null,
          webhook_url: webhookUrl,
          webhook_token: webhookToken,
          status,
          last_ping_at: reachable ? new Date().toISOString() : null,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Upsert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ connection: { id: data.id, status: data.status, last_ping_at: data.last_ping_at } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("openclaw-register error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
