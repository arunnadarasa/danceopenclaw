import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIVY_API_URL = "https://api.privy.io/v1";

// ─── Chain Registry ────────────────────────────────────────────────────────────
// Maps user-facing chain keys to Privy chain_type and chain_id
const CHAIN_REGISTRY: Record<string, { chain_type: string; chain_id?: number; label: string; network: "testnet" | "mainnet" }> = {
  // Testnets
  base_sepolia:   { chain_type: "ethereum", chain_id: 84532,  label: "Base Sepolia",    network: "testnet" },
  solana_devnet:  { chain_type: "solana",                      label: "Solana Devnet",   network: "testnet" },
  story_aeneid:   { chain_type: "ethereum", chain_id: 1315,   label: "Story Aeneid",    network: "testnet" },
  // Mainnets
  base:           { chain_type: "ethereum", chain_id: 8453,   label: "Base",            network: "mainnet" },
  ethereum:       { chain_type: "ethereum", chain_id: 1,      label: "Ethereum",        network: "mainnet" },
  solana:         { chain_type: "solana",                      label: "Solana",          network: "mainnet" },
  story:          { chain_type: "ethereum", chain_id: 1514,   label: "Story",           network: "mainnet" },
};

// USDC contract addresses per chain
const USDC_CONTRACTS: Record<string, string> = {
  // Testnets
  base_sepolia:   "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  // Mainnets
  base:           "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  ethereum:       "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

// ERC-20 transfer function signature
const ERC20_TRANSFER_SIG = "0xa9059cbb";

// Helper: pad address to 32 bytes
function padAddress(address: string): string {
  return "0x" + address.replace("0x", "").padStart(64, "0");
}

// Helper: encode uint256
function encodeUint256(value: string): string {
  const big = BigInt(value);
  return big.toString(16).padStart(64, "0");
}

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

// Helper: JSON error response
function jsonError(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Helper: resolve chain key, supporting legacy keys from v1
function resolveChainKey(chain: string | undefined, fallback = "base_sepolia"): string {
  if (!chain) return fallback;
  // Support legacy keys from v1
  const aliases: Record<string, string> = {
    solana: "solana_devnet",
    story: "story_aeneid",
  };
  return aliases[chain] || chain;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("Unauthorized", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonError("Unauthorized", 401);
    }
    const userId = claimsData.claims.sub as string;

    // Privy credentials
    const PRIVY_APP_ID = Deno.env.get("PRIVY_APP_ID");
    const PRIVY_APP_SECRET = Deno.env.get("PRIVY_APP_SECRET");
    if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
      return jsonError("Privy credentials not configured", 500);
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
      return jsonError("Agent not found. Complete onboarding first.");
    }

    // Parse existing wallet config from agent
    const config = (agent.config as Record<string, unknown>) || {};
    const wallets = (config.privy_wallets as Record<string, { id: string; address: string; chain_type: string }>) || {};

    // Helper: persist wallets back to config
    const saveWallets = async () => {
      await serviceClient
        .from("agents")
        .update({ config: { ...config, privy_wallets: wallets } })
        .eq("id", agent.id);
    };

    let result: unknown;

    switch (action) {
      // ─── CREATE WALLET ───────────────────────────────────────────
      case "create_wallet": {
        const chainKey = resolveChainKey(body.chain);
        const chainInfo = CHAIN_REGISTRY[chainKey];

        if (!chainInfo) {
          return jsonError(`Unknown chain: ${body.chain}. Available: ${Object.keys(CHAIN_REGISTRY).join(", ")}`);
        }

        if (wallets[chainKey]) {
          return jsonError(`Wallet already exists for ${chainInfo.label}`, 400);
        }

        const wallet = await privyFetch("/wallets", "POST", PRIVY_APP_ID, PRIVY_APP_SECRET, {
          chain_type: chainInfo.chain_type,
        });

        wallets[chainKey] = {
          id: wallet.id,
          address: wallet.address,
          chain_type: wallet.chain_type,
        };

        await saveWallets();

        result = {
          message: `${chainInfo.label} wallet created successfully`,
          wallet: { id: wallet.id, address: wallet.address, chain: chainKey, network: chainInfo.network },
        };
        break;
      }

      // ─── CREATE ALL WALLETS ──────────────────────────────────────
      case "create_all_wallets": {
        const { network } = body; // "testnet" | "mainnet" | undefined (defaults to testnet)
        const targetNetwork = network || "testnet";

        const targetChains = Object.entries(CHAIN_REGISTRY).filter(
          ([, info]) => info.network === targetNetwork
        );

        const created: Array<{ chain: string; label: string; id: string; address: string }> = [];
        const skipped: string[] = [];

        for (const [key, info] of targetChains) {
          if (wallets[key]) {
            skipped.push(key);
            continue;
          }

          const wallet = await privyFetch("/wallets", "POST", PRIVY_APP_ID, PRIVY_APP_SECRET, {
            chain_type: info.chain_type,
          });

          wallets[key] = {
            id: wallet.id,
            address: wallet.address,
            chain_type: wallet.chain_type,
          };

          created.push({ chain: key, label: info.label, id: wallet.id, address: wallet.address });
        }

        await saveWallets();
        result = { network: targetNetwork, created, skipped, wallets };
        break;
      }

      // ─── LIST SUPPORTED CHAINS ──────────────────────────────────
      case "list_chains": {
        result = {
          chains: Object.entries(CHAIN_REGISTRY).map(([key, info]) => ({
            key,
            label: info.label,
            chain_type: info.chain_type,
            chain_id: info.chain_id,
            network: info.network,
            has_usdc: !!USDC_CONTRACTS[key],
          })),
        };
        break;
      }

      // ─── GET WALLETS ─────────────────────────────────────────────
      case "get_wallets": {
        const enriched = Object.entries(wallets).map(([key, w]) => ({
          chain: key,
          label: CHAIN_REGISTRY[key]?.label || key,
          network: CHAIN_REGISTRY[key]?.network || "unknown",
          ...w,
        }));
        result = { wallets: enriched };
        break;
      }

      // ─── GET BALANCE ─────────────────────────────────────────────
      case "get_balance": {
        const chainKey = resolveChainKey(body.chain);
        const wallet = wallets[chainKey];

        if (!wallet) {
          return jsonError(`No wallet found for ${chainKey}. Create one first.`);
        }

        const balance = await privyFetch(
          `/wallets/${wallet.id}/balance`,
          "GET",
          PRIVY_APP_ID,
          PRIVY_APP_SECRET
        );

        result = {
          chain: chainKey,
          label: CHAIN_REGISTRY[chainKey]?.label,
          network: CHAIN_REGISTRY[chainKey]?.network,
          wallet_id: wallet.id,
          address: wallet.address,
          ...balance,
        };
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
            balances[key] = {
              address: wallet.address,
              label: CHAIN_REGISTRY[key]?.label,
              network: CHAIN_REGISTRY[key]?.network,
              ...balance,
            };
          } catch (e) {
            balances[key] = { address: wallet.address, error: e instanceof Error ? e.message : "Failed" };
          }
        }

        result = { balances };
        break;
      }

      // ─── SEND NATIVE TOKEN (EVM) ────────────────────────────────
      case "send_native_token": {
        const chainKey = resolveChainKey(body.chain);
        const wallet = wallets[chainKey];
        const chainInfo = CHAIN_REGISTRY[chainKey];

        if (!wallet) return jsonError(`No wallet found for ${chainKey}`);
        if (!chainInfo) return jsonError(`Unknown chain: ${chainKey}`);
        if (wallet.chain_type !== "ethereum") return jsonError("Use send_sol for Solana transactions");
        if (!body.to || !body.value) return jsonError("to and value are required");

        const resolvedChainId = body.chainId || chainInfo.chain_id;

        const txResult = await privyFetch(
          `/wallets/${wallet.id}/rpc`,
          "POST",
          PRIVY_APP_ID,
          PRIVY_APP_SECRET,
          {
            method: "eth_sendTransaction",
            params: {
              transaction: {
                to: body.to,
                value: body.value,
                chain_id: resolvedChainId,
              },
            },
          }
        );
        result = { chain: chainKey, network: chainInfo.network, ...txResult };
        break;
      }

      // ─── SEND USDC (ERC-20 Transfer) ────────────────────────────
      case "send_usdc": {
        const chainKey = resolveChainKey(body.chain, "base");
        const wallet = wallets[chainKey];
        const chainInfo = CHAIN_REGISTRY[chainKey];
        const usdcAddress = USDC_CONTRACTS[chainKey];

        if (!wallet) return jsonError(`No wallet found for ${chainKey}`);
        if (!chainInfo) return jsonError(`Unknown chain: ${chainKey}`);
        if (wallet.chain_type !== "ethereum") return jsonError("USDC transfers only supported on EVM chains");
        if (!usdcAddress) return jsonError(`USDC not available on ${chainInfo.label}. Available on: ${Object.keys(USDC_CONTRACTS).join(", ")}`);
        if (!body.to || !body.amount) return jsonError("to and amount are required. Amount is in USDC units (e.g. '1.50' for $1.50)");

        // Convert USDC amount to 6-decimal raw value
        const parts = body.amount.toString().split(".");
        const whole = parts[0] || "0";
        const frac = (parts[1] || "").padEnd(6, "0").slice(0, 6);
        const rawAmount = (BigInt(whole) * BigInt(1_000_000) + BigInt(frac)).toString();

        // Encode ERC-20 transfer(address,uint256) calldata
        const calldata = ERC20_TRANSFER_SIG +
          padAddress(body.to).replace("0x", "") +
          encodeUint256(rawAmount);

        const resolvedChainId = body.chainId || chainInfo.chain_id;

        const txResult = await privyFetch(
          `/wallets/${wallet.id}/rpc`,
          "POST",
          PRIVY_APP_ID,
          PRIVY_APP_SECRET,
          {
            method: "eth_sendTransaction",
            params: {
              transaction: {
                to: usdcAddress,
                data: calldata,
                value: "0x0",
                chain_id: resolvedChainId,
              },
            },
          }
        );
        result = {
          chain: chainKey,
          network: chainInfo.network,
          usdc_contract: usdcAddress,
          amount: body.amount,
          raw_amount: rawAmount,
          ...txResult,
        };
        break;
      }

      // ─── SEND SOL ───────────────────────────────────────────────
      case "send_sol": {
        const chainKey = body.chain === "solana" ? "solana" : resolveChainKey(body.chain, "solana_devnet");
        const wallet = wallets[chainKey];

        if (!wallet) return jsonError(`No Solana wallet found for ${chainKey}. Create one first.`);

        if (body.transaction) {
          const txResult = await privyFetch(
            `/wallets/${wallet.id}/rpc`,
            "POST",
            PRIVY_APP_ID,
            PRIVY_APP_SECRET,
            {
              method: "signAndSendTransaction",
              params: {
                transaction: body.transaction,
                encoding: "base64",
              },
            }
          );
          result = { chain: chainKey, network: CHAIN_REGISTRY[chainKey]?.network, ...txResult };
        } else {
          return jsonError("Provide a serialized transaction in base64 format as 'transaction'");
        }
        break;
      }

      // ─── SIGN MESSAGE ───────────────────────────────────────────
      case "sign_message": {
        const chainKey = resolveChainKey(body.chain);
        const wallet = wallets[chainKey];

        if (!wallet || !body.message) return jsonError("Wallet not found or message missing");

        if (wallet.chain_type === "ethereum") {
          const signResult = await privyFetch(
            `/wallets/${wallet.id}/rpc`,
            "POST",
            PRIVY_APP_ID,
            PRIVY_APP_SECRET,
            { method: "personal_sign", params: { message: body.message } }
          );
          result = { chain: chainKey, ...signResult };
        } else if (wallet.chain_type === "solana") {
          const signResult = await privyFetch(
            `/wallets/${wallet.id}/rpc`,
            "POST",
            PRIVY_APP_ID,
            PRIVY_APP_SECRET,
            {
              method: "signMessage",
              params: { message: btoa(body.message), encoding: "base64" },
            }
          );
          result = { chain: chainKey, ...signResult };
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
              "list_chains",
              "get_wallets",
              "get_balance",
              "get_all_balances",
              "send_native_token",
              "send_usdc",
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
