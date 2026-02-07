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

    // Fetch user's connection
    const { data: conn, error: connError } = await supabase
      .from("openclaw_connections")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (connError || !conn) {
      return new Response(
        JSON.stringify({ connected: false, status: "not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize URL
    let webhookUrl = (conn.webhook_url || "").trim();
    if (!/^https?:\/\//i.test(webhookUrl)) {
      webhookUrl = `https://${webhookUrl}`;
    }

    // Multi-path ping
    const { reachable, pingDetail } = await multiPathPing(webhookUrl, conn.webhook_token);
    const newStatus = reachable ? "connected" : "disconnected";

    // Update status using service role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient
      .from("openclaw_connections")
      .update({
        status: newStatus,
        ...(reachable ? { last_ping_at: new Date().toISOString() } : {}),
      })
      .eq("id", conn.id);

    return new Response(
      JSON.stringify({
        connected: reachable,
        status: newStatus,
        last_ping_at: reachable ? new Date().toISOString() : conn.last_ping_at,
        webhook_url: conn.webhook_url,
        ping_detail: pingDetail,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("openclaw-status error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
