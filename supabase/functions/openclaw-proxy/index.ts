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

    const { taskType, message, sessionKey } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's OpenClaw connection
    const { data: conn, error: connError } = await supabase
      .from("openclaw_connections")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (connError || !conn) {
      return new Response(
        JSON.stringify({ error: "OpenClaw not connected. Please configure your connection first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's agent
    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", userId)
      .single();

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create task record
    const taskId = crypto.randomUUID();
    const taskSessionKey = sessionKey || `dance:task:${taskId}`;

    const { error: taskError } = await serviceClient
      .from("agent_tasks")
      .insert({
        id: taskId,
        agent_id: agent?.id ?? null,
        user_id: userId,
        task_type: taskType || "custom",
        message,
        session_key: taskSessionKey,
        status: "pending",
      });

    if (taskError) {
      console.error("Task insert error:", taskError);
      return new Response(
        JSON.stringify({ error: "Failed to create task" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send to OpenClaw agent
    try {
      const openclawRes = await fetch(`${conn.webhook_url}/hooks/agent`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.webhook_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          name: "DanceOpenClaw",
          sessionKey: taskSessionKey,
          deliver: false,
          timeoutSeconds: 120,
        }),
        signal: AbortSignal.timeout(15000),
      });

      // Update task status to running
      await serviceClient
        .from("agent_tasks")
        .update({ status: "running" })
        .eq("id", taskId);

      // If OpenClaw responds synchronously with a result
      if (openclawRes.ok) {
        try {
          const responseBody = await openclawRes.json();
          if (responseBody?.result || responseBody?.response) {
            await serviceClient
              .from("agent_tasks")
              .update({
                status: "completed",
                response: responseBody,
                completed_at: new Date().toISOString(),
              })
              .eq("id", taskId);
          }
        } catch {
          // Response wasn't JSON or was empty — task stays in "running"
        }
      } else {
        const errorText = await openclawRes.text();
        await serviceClient
          .from("agent_tasks")
          .update({
            status: "failed",
            error_message: `OpenClaw returned ${openclawRes.status}: ${errorText}`,
          })
          .eq("id", taskId);
      }
    } catch (fetchErr) {
      await serviceClient
        .from("agent_tasks")
        .update({
          status: "failed",
          error_message: fetchErr instanceof Error ? fetchErr.message : "Failed to reach OpenClaw",
        })
        .eq("id", taskId);
    }

    return new Response(
      JSON.stringify({ taskId, status: "submitted" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("openclaw-proxy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
