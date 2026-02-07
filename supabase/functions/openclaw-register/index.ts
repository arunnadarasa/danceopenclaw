import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Try multiple health-check endpoints and return diagnostic info */
async function multiPathPing(
  baseUrl: string,
  token: string
): Promise<{ reachable: boolean; pingDetail: string }> {
  const endpoints = [
    { path: "/hooks/wake", method: "POST", body: JSON.stringify({ text: "Dance OpenClaw health check", mode: "now" }) },
    { path: "/webhook", method: "POST", body: JSON.stringify({ text: "ping" }) },
    { path: "/", method: "GET", body: undefined },
  ];

  const results: string[] = [];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(ep.body ? { body: ep.body } : {}),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok || res.status === 202) {
        results.push(`${ep.path} -> ${res.status} OK`);
        return { reachable: true, pingDetail: results.join("; ") };
      }
      const snippet = await res.text().catch(() => "");
      const shortSnippet = snippet.slice(0, 120);
      results.push(`${ep.path} -> ${res.status} ${res.statusText}${shortSnippet ? ` (${shortSnippet})` : ""}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const isTimeout = msg.includes("timed out") || msg.includes("timeout") || msg.includes("AbortError");
      results.push(`${ep.path} -> ${isTimeout ? "timeout after 10s" : msg}`);
    }
  }

  return { reachable: false, pingDetail: results.join("; ") };
}

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Handle DELETE — disconnect
    if (req.method === "DELETE") {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await serviceClient
        .from("openclaw_connections")
        .delete()
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ disconnected: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle POST — register / update connection
    let { webhookUrl, webhookToken } = await req.json();

    if (!webhookUrl || !webhookToken) {
      return new Response(
        JSON.stringify({ error: "webhookUrl and webhookToken are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize URL
    webhookUrl = webhookUrl.trim();
    if (!/^https?:\/\//i.test(webhookUrl)) {
      webhookUrl = `https://${webhookUrl}`;
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

    // Multi-path ping
    const { reachable, pingDetail } = await multiPathPing(webhookUrl, webhookToken);
    const status = reachable ? "connected" : "pending";

    // Get user's agent
    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", userId)
      .single();

    // Use service role client for upsert
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
      JSON.stringify({
        connection: {
          id: data.id,
          status: data.status,
          last_ping_at: data.last_ping_at,
          ping_detail: pingDetail,
        },
      }),
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
