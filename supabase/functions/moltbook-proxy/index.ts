import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MOLTBOOK_BASE = "https://www.moltbook.com/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, ...data } = body;

    // Get user's agent
    const { data: agent, error: agentError } = await adminClient
      .from("agents")
      .select("id, name")
      .eq("user_id", user.id)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: "No agent found. Complete onboarding first." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- REGISTER ---
    if (action === "register") {
      const { agentName, agentDescription } = data;
      if (!agentName || !agentDescription) {
        return new Response(
          JSON.stringify({ error: "agentName and agentDescription required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Call Moltbook register
      const mbRes = await fetch(`${MOLTBOOK_BASE}/agents/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          description: agentDescription,
        }),
      });

      const mbData = await mbRes.json();
      if (!mbRes.ok) {
        return new Response(
          JSON.stringify({
            error: mbData.error || mbData.message || "Moltbook registration failed",
            details: mbData,
          }),
          {
            status: mbRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Store credentials
      const apiKey = mbData.api_key || mbData.apiKey;
      const claimUrl = mbData.claim_url || mbData.claimUrl;

      const { error: insertError } = await adminClient
        .from("moltbook_connections")
        .insert({
          user_id: user.id,
          agent_id: agent.id,
          moltbook_api_key: apiKey,
          moltbook_agent_name: agentName,
          claim_url: claimUrl,
          claim_status: "pending_claim",
        });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to store connection", details: insertError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          claimUrl,
          agentName,
          message: mbData.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For all other actions, we need an existing connection
    const { data: connection, error: connError } = await adminClient
      .from("moltbook_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "No Moltbook connection found. Register first." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mbHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${connection.moltbook_api_key}`,
    };

    // --- STATUS ---
    if (action === "status") {
      const res = await fetch(`${MOLTBOOK_BASE}/agents/status`, {
        headers: mbHeaders,
      });
      const statusData = await res.json();

      // Update claim_status in DB if changed
      const newStatus = statusData.claimed ? "claimed" : "pending_claim";
      if (newStatus !== connection.claim_status) {
        await adminClient
          .from("moltbook_connections")
          .update({ claim_status: newStatus })
          .eq("id", connection.id);
      }

      return new Response(
        JSON.stringify({ ...statusData, claim_status: newStatus }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- PROFILE ---
    if (action === "profile") {
      const res = await fetch(`${MOLTBOOK_BASE}/agents/me`, {
        headers: mbHeaders,
      });
      const profileData = await res.json();
      return new Response(JSON.stringify(profileData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- FEED ---
    if (action === "feed") {
      const sort = data.sort || "hot";
      const limit = data.limit || 20;
      const res = await fetch(
        `${MOLTBOOK_BASE}/posts?sort=${sort}&limit=${limit}`,
        { headers: mbHeaders }
      );
      const feedData = await res.json();
      return new Response(JSON.stringify(feedData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- POST ---
    if (action === "post") {
      const { title, content, submolt } = data;
      if (!title || !content) {
        return new Response(
          JSON.stringify({ error: "title and content required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const postBody: Record<string, string> = { title, content };
      if (submolt) postBody.submolt = submolt;

      const res = await fetch(`${MOLTBOOK_BASE}/posts`, {
        method: "POST",
        headers: mbHeaders,
        body: JSON.stringify(postBody),
      });
      const postData = await res.json();
      return new Response(JSON.stringify(postData), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- SUBMOLTS ---
    if (action === "submolts") {
      const res = await fetch(`${MOLTBOOK_BASE}/submolts`, {
        headers: mbHeaders,
      });
      const submoltsData = await res.json();
      return new Response(JSON.stringify(submoltsData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- DISCONNECT ---
    if (action === "disconnect") {
      await adminClient
        .from("moltbook_connections")
        .delete()
        .eq("id", connection.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("moltbook-proxy error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
