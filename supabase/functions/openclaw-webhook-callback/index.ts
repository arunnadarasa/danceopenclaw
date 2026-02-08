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
    // This is a public-ish endpoint called by OpenClaw instances
    // Auth is done via the webhook token in the body/header
    const body = await req.json();
    const { sessionKey, result, error: taskError, webhookToken } = body;

    if (!sessionKey) {
      return new Response(
        JSON.stringify({ error: "sessionKey is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the task by session key
    const { data: task, error: findError } = await serviceClient
      .from("agent_tasks")
      .select("id, user_id")
      .eq("session_key", sessionKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (findError || !task) {
      return new Response(
        JSON.stringify({ error: "Task not found for session key" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate webhook token (required)
    if (!webhookToken) {
      return new Response(
        JSON.stringify({ error: "webhookToken is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: conn } = await serviceClient
      .from("openclaw_connections")
      .select("webhook_token")
      .eq("user_id", task.user_id)
      .single();

    if (!conn || conn.webhook_token !== webhookToken) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the task
    const updatePayload: Record<string, unknown> = {
      completed_at: new Date().toISOString(),
    };

    if (taskError) {
      updatePayload.status = "failed";
      updatePayload.error_message = typeof taskError === "string" ? taskError : JSON.stringify(taskError);
    } else {
      updatePayload.status = "completed";
      updatePayload.response = result ?? body;
    }

    await serviceClient
      .from("agent_tasks")
      .update(updatePayload)
      .eq("id", task.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("openclaw-webhook-callback error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
