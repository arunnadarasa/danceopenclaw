import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIVY_API_URL = "https://api.privy.io/v1";

// Helper: Privy Basic Auth header
function getPrivyAuthHeaders(appId: string, appSecret: string) {
  const encoded = btoa(`${appId}:${appSecret}`);
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
    "privy-app-id": appId,
  };
}

// Helper: call Privy API
async function privyFetch(
  path: string,
  method: string,
  appId: string,
  appSecret: string,
  body?: Record<string, unknown>
) {
  const res = await fetch(`${PRIVY_API_URL}${path}`, {
    method,
    headers: getPrivyAuthHeaders(appId, appSecret),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Privy API error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
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
    const userId = claimsData.claims.sub as string;

    // Privy credentials
    const PRIVY_APP_ID = Deno.env.get("PRIVY_APP_ID");
    const PRIVY_APP_SECRET = Deno.env.get("PRIVY_APP_SECRET");
    if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
      return new Response(
        JSON.stringify({ error: "Privy credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's agent
    const { data: agent } = await supabase
      .from("agents")
      .select("id, config")
      .eq("user_id", userId)
      .single();

    if (!agent) {
      return new Response(
        JSON.stringify({ error: "Agent not found. Complete onboarding first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse existing wallet config from agent
    const config = (agent.config as Record<string, unknown>) || {};
    const wallets = (config.privy_wallets as Record<string, { id: string; address: string; chain_type: string }>) || {};

    let result: unknown;

    switch (action) {
      // ─── CREATE WALLET ───────────────────────────────────────────
      case "create_wallet": {
        const { chain } = body;
        const chainType = chain === "solana" ? "solana" : "ethereum";
        const walletKey = chain || chainType; // base_sepolia, solana, story

        if (wallets[walletKey]) {
          return new Response(
            JSON.stringify({
              error: `Wallet already exists for ${walletKey}`,
              wallet: wallets[walletKey],
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const wallet = await privyFetch("/wallets", "POST", PRIVY_APP_ID, PRIVY_APP_SECRET, {
          chain_type: chainType,
        });

        // Store wallet info in agent config
        wallets[walletKey] = {
          id: wallet.id,
          address: wallet.address,
          chain_type: wallet.chain_type,
        };

        await serviceClient
          .from("agents")
          .update({ config: { ...config, privy_wallets: wallets } })
          .eq("id", agent.id);

        result = {
          message: `${walletKey} wallet created successfully`,
          wallet: {
            id: wallet.id,
            address: wallet.address,
            chain_type: wallet.chain_type,
            chain: walletKey,
          },
        };
        break;
      }

      // ─── CREATE ALL WALLETS ──────────────────────────────────────
      case "create_all_wallets": {
        const chains = [
          { key: "base_sepolia", chain_type: "ethereum" },
          { key: "solana", chain_type: "solana" },
          { key: "story", chain_type: "ethereum" },
        ];

        const created: Array<{ chain: string; id: string; address: string }> = [];
        const skipped: string[] = [];

        for (const chain of chains) {
          if (wallets[chain.key]) {
            skipped.push(chain.key);
            continue;
          }

          const wallet = await privyFetch("/wallets", "POST", PRIVY_APP_ID, PRIVY_APP_SECRET, {
            chain_type: chain.chain_type,
          });

          wallets[chain.key] = {
            id: wallet.id,
            address: wallet.address,
            chain_type: wallet.chain_type,
          };

          created.push({ chain: chain.key, id: wallet.id, address: wallet.address });
        }

        await serviceClient
          .from("agents")
          .update({ config: { ...config, privy_wallets: wallets } })
          .eq("id", agent.id);

        result = { created, skipped, wallets };
        break;
      }

      // ─── GET WALLETS ─────────────────────────────────────────────
      case "get_wallets": {
        result = { wallets };
        break;
      }

      // ─── GET BALANCE ─────────────────────────────────────────────
      case "get_balance": {
        const { chain } = body;
        const walletKey = chain || "base_sepolia";
        const wallet = wallets[walletKey];

        if (!wallet) {
          return new Response(
            JSON.stringify({ error: `No wallet found for ${walletKey}. Create one first.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const balance = await privyFetch(
          `/wallets/${wallet.id}/balance`,
          "GET",
          PRIVY_APP_ID,
          PRIVY_APP_SECRET
        );

        result = { chain: walletKey, wallet_id: wallet.id, address: wallet.address, ...balance };
        break;
      }

      // ─── GET ALL BALANCES ────────────────────────────────────────
      case "get_all_balances": {
        const balances: Record<string, unknown> = {};

        for (const [key, wallet] of Object.entries(wallets)) {
          try {
            const balance = await privyFetch(
              `/wallets/${wallet.id}/balance`,
              "GET",
              PRIVY_APP_ID,
              PRIVY_APP_SECRET
            );
            balances[key] = { address: wallet.address, ...balance };
          } catch (e) {
            balances[key] = { address: wallet.address, error: e instanceof Error ? e.message : "Failed" };
          }
        }

        result = { balances };
        break;
      }

      // ─── SEND NATIVE TOKEN (EVM) ────────────────────────────────
      case "send_native_token": {
        const { chain, to, value, chainId } = body;
        const walletKey = chain || "base_sepolia";
        const wallet = wallets[walletKey];

        if (!wallet) {
          return new Response(
            JSON.stringify({ error: `No wallet found for ${walletKey}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!to || !value) {
          return new Response(
            JSON.stringify({ error: "to and value are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Determine chain ID
        const resolvedChainId = chainId ||
          (walletKey === "base_sepolia" ? 84532 : walletKey === "story" ? 1315 : undefined);

        if (wallet.chain_type === "ethereum") {
          const txResult = await privyFetch(
            `/wallets/${wallet.id}/rpc`,
            "POST",
            PRIVY_APP_ID,
            PRIVY_APP_SECRET,
            {
              method: "eth_sendTransaction",
              params: {
                transaction: {
                  to,
                  value,
                  chain_id: resolvedChainId,
                },
              },
            }
          );
          result = { chain: walletKey, ...txResult };
        } else {
          return new Response(
            JSON.stringify({ error: "Use send_sol action for Solana transactions" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      // ─── SEND SOL ───────────────────────────────────────────────
      case "send_sol": {
        const { to, lamports, transaction: serializedTx } = body;
        const wallet = wallets["solana"];

        if (!wallet) {
          return new Response(
            JSON.stringify({ error: "No Solana wallet found. Create one first." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (serializedTx) {
          // Sign and send a pre-built transaction
          const txResult = await privyFetch(
            `/wallets/${wallet.id}/rpc`,
            "POST",
            PRIVY_APP_ID,
            PRIVY_APP_SECRET,
            {
              method: "signAndSendTransaction",
              params: {
                transaction: serializedTx,
                encoding: "base64",
              },
            }
          );
          result = { chain: "solana", ...txResult };
        } else if (to && lamports) {
          // For simple SOL transfers, the caller should build a serialized tx
          return new Response(
            JSON.stringify({
              error: "For Solana transfers, provide a serialized transaction in base64 format",
              hint: "Build the transaction client-side or via another edge function, then pass it as 'transaction'",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ error: "Provide a serialized transaction" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      // ─── SIGN MESSAGE ───────────────────────────────────────────
      case "sign_message": {
        const { chain, message } = body;
        const walletKey = chain || "base_sepolia";
        const wallet = wallets[walletKey];

        if (!wallet || !message) {
          return new Response(
            JSON.stringify({ error: "Wallet not found or message missing" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (wallet.chain_type === "ethereum") {
          const signResult = await privyFetch(
            `/wallets/${wallet.id}/rpc`,
            "POST",
            PRIVY_APP_ID,
            PRIVY_APP_SECRET,
            {
              method: "personal_sign",
              params: { message },
            }
          );
          result = { chain: walletKey, ...signResult };
        } else if (wallet.chain_type === "solana") {
          const signResult = await privyFetch(
            `/wallets/${wallet.id}/rpc`,
            "POST",
            PRIVY_APP_ID,
            PRIVY_APP_SECRET,
            {
              method: "signMessage",
              params: {
                message: btoa(message),
                encoding: "base64",
              },
            }
          );
          result = { chain: walletKey, ...signResult };
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({
            error: `Unknown action: ${action}`,
            available_actions: [
              "create_wallet",
              "create_all_wallets",
              "get_wallets",
              "get_balance",
              "get_all_balances",
              "send_native_token",
              "send_sol",
              "sign_message",
            ],
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-wallet error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
