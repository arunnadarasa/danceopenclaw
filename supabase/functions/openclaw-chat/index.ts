import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIMEOUT_MS = 60_000;

function uid(): string {
  return crypto.randomUUID().slice(0, 8);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authenticate user ---
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

    // --- Read user's connection details ---
    const { data: conn, error: connError } = await supabase
      .from("openclaw_connections")
      .select("webhook_url, webhook_token")
      .eq("user_id", user.id)
      .single();

    if (connError || !conn) {
      return new Response(
        JSON.stringify({ error: "No OpenClaw connection configured. Please set up your connection first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Parse request body ---
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    if (!lastUserMsg) {
      return new Response(
        JSON.stringify({ error: "No user message found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Build WebSocket URL from webhook URL ---
    let webhookUrl = (conn.webhook_url || "").trim();
    if (!/^https?:\/\//i.test(webhookUrl)) {
      webhookUrl = `https://${webhookUrl}`;
    }
    const wsUrl = webhookUrl.replace(/^https?:\/\//i, "wss://").replace(/\/+$/, "") + "/ws";
    const token = conn.webhook_token;

    console.log(`[openclaw-chat] Connecting to ${wsUrl} for user ${user.id}`);

    // --- SSE stream via WebSocket bridge ---
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const sendSSE = (data: string) => {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        const timeout = setTimeout(() => {
          sendSSE(JSON.stringify({
            choices: [{ delta: { content: "\n\n[Connection timed out]" }, index: 0, finish_reason: "stop" }]
          }));
          sendSSE("[DONE]");
          try { controller.close(); } catch { /* */ }
        }, TIMEOUT_MS);

        let ws: WebSocket;
        try {
          ws = new WebSocket(wsUrl);
        } catch (err) {
          clearTimeout(timeout);
          sendSSE(JSON.stringify({
            choices: [{ delta: { content: "Failed to connect to your OpenClaw server" }, index: 0, finish_reason: "stop" }]
          }));
          sendSSE("[DONE]");
          controller.close();
          return;
        }

        let authenticated = false;
        let chatRequestSent = false;
        let lastSentLength = 0;

        const sendConnect = () => {
          ws.send(JSON.stringify({
            type: "req",
            id: uid(),
            method: "connect",
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: "cli",
                displayName: "dance-openclaw-bridge",
                version: "1.0.0",
                platform: "linux",
                mode: "cli"
              },
              auth: { token },
              locale: "en-US"
            }
          }));
        };

        const sendChatMessage = () => {
          if (chatRequestSent) return;
          chatRequestSent = true;
          ws.send(JSON.stringify({
            type: "req",
            id: uid(),
            method: "chat.send",
            params: {
              sessionKey: "webchat:dance:" + uid(),
              idempotencyKey: uid(),
              message: lastUserMsg.content
            }
          }));
        };

        const closeCleanly = () => {
          clearTimeout(timeout);
          sendSSE(JSON.stringify({
            choices: [{ delta: {}, index: 0, finish_reason: "stop" }]
          }));
          sendSSE("[DONE]");
          try { controller.close(); } catch { /* */ }
          try { ws.close(); } catch { /* */ }
        };

        const closeWithError = (msg: string) => {
          clearTimeout(timeout);
          sendSSE(JSON.stringify({
            choices: [{ delta: { content: msg }, index: 0, finish_reason: "stop" }]
          }));
          sendSSE("[DONE]");
          try { controller.close(); } catch { /* */ }
          try { ws.close(); } catch { /* */ }
        };

        const formatError = (err: unknown): string => {
          if (typeof err === "string") return err;
          if (err && typeof err === "object") {
            const e = err as Record<string, unknown>;
            if (e.message && typeof e.message === "string") return e.message;
            return JSON.stringify(err);
          }
          return "unknown error";
        };

        ws.onopen = () => {
          setTimeout(() => {
            if (!authenticated) sendConnect();
          }, 500);
        };

        ws.onmessage = (event) => {
          let frame: Record<string, unknown>;
          try {
            frame = JSON.parse(typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data as ArrayBuffer));
          } catch { return; }

          // Handle connect challenge
          if (frame.type === "event" && frame.event === "connect.challenge") {
            sendConnect();
            return;
          }

          // Handle auth response
          if (frame.type === "res" && !authenticated) {
            if (frame.ok) {
              authenticated = true;
              sendChatMessage();
            } else {
              closeWithError("Authentication failed: " + formatError(frame.error));
            }
            return;
          }

          // Handle chat response errors
          if (frame.type === "res" && authenticated) {
            if (!frame.ok) closeWithError("Chat error: " + formatError(frame.error));
            return;
          }

          // Handle events (streaming data)
          if (frame.type === "event") {
            const payload = (frame.payload || {}) as Record<string, unknown>;
            const eventName = frame.event as string;

            // Skip noise
            if (eventName === "tick" || eventName === "health" || eventName === "presence") return;

            // Assistant text stream
            if (eventName === "agent" && payload.stream === "assistant") {
              const data = payload.data as Record<string, unknown> | undefined;
              if (data?.text && typeof data.text === "string") {
                const fullText = data.text;
                const delta = fullText.slice(lastSentLength);
                if (delta) {
                  lastSentLength = fullText.length;
                  sendSSE(JSON.stringify({
                    choices: [{ delta: { content: delta }, index: 0 }]
                  }));
                }
              }
            }

            // Lifecycle end
            if (eventName === "agent" && payload.stream === "lifecycle") {
              const data = payload.data as Record<string, unknown> | undefined;
              if (data?.phase === "end") {
                closeCleanly();
                return;
              }
            }

            // Chat final state
            if (eventName === "chat" && payload.state === "final") {
              closeCleanly();
            }
          }
        };

        ws.onerror = () => closeWithError("\n\n[Connection error]");

        ws.onclose = () => {
          clearTimeout(timeout);
          try { controller.close(); } catch { /* already closed */ }
        };
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("openclaw-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
