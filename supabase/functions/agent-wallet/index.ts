import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "https://esm.sh/@solana/web3.js@1.95.8";
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIVY_API_URL = "https://api.privy.io/v1";

// ─── Chain Registry ────────────────────────────────────────────────────────────
const CHAIN_REGISTRY: Record<string, { chain_type: string; chain_id?: number; caip2?: string; label: string; network: "testnet" | "mainnet" }> = {
  // Testnets
  base_sepolia:   { chain_type: "ethereum", chain_id: 84532,  caip2: "eip155:84532",  label: "Base Sepolia",    network: "testnet" },
  solana_devnet:  { chain_type: "solana",   caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", label: "Solana Devnet",   network: "testnet" },
  story_aeneid:   { chain_type: "ethereum", chain_id: 1315,   caip2: "eip155:1315",   label: "Story Aeneid",    network: "testnet" },
  // Mainnets
  base:           { chain_type: "ethereum", chain_id: 8453,   caip2: "eip155:8453",   label: "Base",            network: "mainnet" },
  solana:         { chain_type: "solana",   caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", label: "Solana",          network: "mainnet" },
  story:          { chain_type: "ethereum", chain_id: 1514,   caip2: "eip155:1514",   label: "Story",           network: "mainnet" },
};

// USDC contract addresses per chain
const USDC_CONTRACTS: Record<string, string> = {
  // Testnets
  base_sepolia:   "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  // Mainnets
  base:           "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

// ─── Wallet Groups ─────────────────────────────────────────────────────────────
const WALLET_GROUPS: Record<string, string> = {
  base_sepolia:   "evm_base",
  base:           "evm_base",
  solana_devnet:  "solana",
  solana:         "solana",
  story_aeneid:   "evm_story",
  story:          "evm_story",
};

// ─── RPC Network Config (for direct blockchain balance queries) ────────────────
const ETH_NETWORKS: Record<string, { rpcUrl: string; usdcAddress: string }> = {
  base_sepolia: { rpcUrl: "https://sepolia.base.org", usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" },
  base:         { rpcUrl: "https://mainnet.base.org", usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
};

// Helper: get Solana RPC URL (supports custom mainnet RPC via env var)
function getSolanaRpcUrl(chainKey: string): string {
  if (chainKey === "solana") {
    return Deno.env.get("SOLANA_MAINNET_RPC_URL") || "https://api.mainnet-beta.solana.com";
  }
  return "https://api.devnet.solana.com";
}

const SOLANA_NETWORKS: Record<string, { rpcUrl: string; usdcMint: string }> = {
  solana_devnet: { rpcUrl: getSolanaRpcUrl("solana_devnet"), usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" },
  solana:        { rpcUrl: getSolanaRpcUrl("solana"),        usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
};

const STORY_NETWORKS: Record<string, { rpcUrl: string; usdceAddress: string | null }> = {
  story_aeneid: { rpcUrl: "https://aeneid.storyrpc.io", usdceAddress: null },
  story:        { rpcUrl: "https://mainnet.storyrpc.io", usdceAddress: "0xF1815bd50389c46847f0Bda824eC8da914045D14" },
};

// ─── Direct RPC Balance Helpers ────────────────────────────────────────────────

async function getEvmNativeBalance(address: string, rpcUrl: string): Promise<string> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
    });
    const data = await res.json();
    if (data.result && data.result !== "0x") {
      const rawBalance = BigInt(data.result);
      return (Number(rawBalance) / 1e18).toFixed(6);
    }
  } catch (e) {
    console.error("getEvmNativeBalance error:", e);
  }
  return "0";
}

async function getEvmErc20Balance(address: string, rpcUrl: string, contractAddress: string): Promise<string> {
  try {
    const balanceOfSelector = "0x70a08231";
    const paddedAddr = address.slice(2).padStart(64, "0");
    const callData = balanceOfSelector + paddedAddr;

    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "eth_call",
        params: [{ to: contractAddress, data: callData }, "latest"],
      }),
    });
    const data = await res.json();
    if (data.result && data.result !== "0x") {
      const rawBalance = BigInt(data.result);
      return (Number(rawBalance) / 1_000_000).toFixed(2);
    }
  } catch (e) {
    console.error("getEvmErc20Balance error:", e);
  }
  return "0";
}

async function getSolanaNativeBalance(address: string, rpcUrl: string): Promise<string> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
    });
    const data = await res.json();
    if (data.result?.value !== undefined) {
      return (Number(data.result.value) / 1e9).toFixed(6);
    }
  } catch (e) {
    console.error("getSolanaNativeBalance error:", e);
  }
  return "0";
}

async function getSolanaTokenBalance(address: string, rpcUrl: string, mint: string): Promise<string> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getTokenAccountsByOwner",
        params: [address, { mint }, { encoding: "jsonParsed" }],
      }),
    });
    const data = await res.json();
    if (data.result?.value?.length > 0) {
      let total = 0;
      for (const account of data.result.value) {
        const tokenAmount = account.account?.data?.parsed?.info?.tokenAmount;
        if (tokenAmount) total += Number(tokenAmount.uiAmount || 0);
      }
      return total.toFixed(2);
    }
  } catch (e) {
    console.error("getSolanaTokenBalance error:", e);
  }
  return "0";
}

// Fetch balances for a single chain key + address
async function fetchChainBalances(chainKey: string, address: string): Promise<{ native_balance: string; usdc_balance: string }> {
  // Base (EVM)
  if (ETH_NETWORKS[chainKey]) {
    const cfg = ETH_NETWORKS[chainKey];
    const [native, usdc] = await Promise.all([
      getEvmNativeBalance(address, cfg.rpcUrl),
      getEvmErc20Balance(address, cfg.rpcUrl, cfg.usdcAddress),
    ]);
    return { native_balance: native, usdc_balance: usdc };
  }

  // Solana
  if (SOLANA_NETWORKS[chainKey]) {
    const cfg = SOLANA_NETWORKS[chainKey];
    const [native, usdc] = await Promise.all([
      getSolanaNativeBalance(address, cfg.rpcUrl),
      getSolanaTokenBalance(address, cfg.rpcUrl, cfg.usdcMint),
    ]);
    return { native_balance: native, usdc_balance: usdc };
  }

  // Story (EVM-compatible)
  if (STORY_NETWORKS[chainKey]) {
    const cfg = STORY_NETWORKS[chainKey];
    const native = await getEvmNativeBalance(address, cfg.rpcUrl);
    let usdc = "0";
    if (cfg.usdceAddress) {
      usdc = await getEvmErc20Balance(address, cfg.rpcUrl, cfg.usdceAddress);
    }
    return { native_balance: native, usdc_balance: usdc };
  }

  return { native_balance: "0", usdc_balance: "0" };
}

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

// Helper: resolve chain key
function resolveChainKey(chain: string | undefined, fallback = "base_sepolia"): string {
  if (!chain) return fallback;
  return chain;
}

// Helper: find an existing wallet in the same wallet group
function findGroupSibling(
  chainKey: string,
  wallets: Record<string, { id: string; address: string; chain_type: string }>
): { id: string; address: string; chain_type: string } | null {
  const group = WALLET_GROUPS[chainKey];
  if (!group) return null;

  for (const [key, w] of Object.entries(wallets)) {
    if (key !== chainKey && WALLET_GROUPS[key] === group) {
      return w;
    }
  }
  return null;
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

        // Check if a wallet in the same group already exists — reuse it
        const sibling = findGroupSibling(chainKey, wallets);
        if (sibling) {
          wallets[chainKey] = {
            id: sibling.id,
            address: sibling.address,
            chain_type: sibling.chain_type,
          };
        } else {
          const wallet = await privyFetch("/wallets", "POST", PRIVY_APP_ID, PRIVY_APP_SECRET, {
            chain_type: chainInfo.chain_type,
          });

          wallets[chainKey] = {
            id: wallet.id,
            address: wallet.address,
            chain_type: wallet.chain_type,
          };
        }

        await saveWallets();

        result = {
          message: `${chainInfo.label} wallet created successfully`,
          wallet: { id: wallets[chainKey].id, address: wallets[chainKey].address, chain: chainKey, network: chainInfo.network },
        };
        break;
      }

      // ─── CREATE ALL WALLETS ──────────────────────────────────────
      case "create_all_wallets": {
        const { network } = body;
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

          const sibling = findGroupSibling(key, wallets);
          if (sibling) {
            wallets[key] = {
              id: sibling.id,
              address: sibling.address,
              chain_type: sibling.chain_type,
            };
          } else {
            const wallet = await privyFetch("/wallets", "POST", PRIVY_APP_ID, PRIVY_APP_SECRET, {
              chain_type: info.chain_type,
            });

            wallets[key] = {
              id: wallet.id,
              address: wallet.address,
              chain_type: wallet.chain_type,
            };
          }

          created.push({ chain: key, label: info.label, id: wallets[key].id, address: wallets[key].address });
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

      // ─── GET BALANCE (single chain, direct RPC) ──────────────────
      case "get_balance": {
        const chainKey = resolveChainKey(body.chain);
        const wallet = wallets[chainKey];

        if (!wallet) {
          return jsonError(`No wallet found for ${chainKey}. Create one first.`);
        }

        const balanceData = await fetchChainBalances(chainKey, wallet.address);

        result = {
          chain: chainKey,
          label: CHAIN_REGISTRY[chainKey]?.label,
          network: CHAIN_REGISTRY[chainKey]?.network,
          wallet_id: wallet.id,
          address: wallet.address,
          ...balanceData,
        };
        break;
      }

      // ─── GET ALL BALANCES (direct RPC for all chains) ────────────
      case "get_all_balances": {
        const balances: Record<string, unknown> = {};

        const entries = Object.entries(wallets);
        const results = await Promise.allSettled(
          entries.map(async ([key, wallet]) => {
            const balanceData = await fetchChainBalances(key, wallet.address);
            return { key, wallet, balanceData };
          })
        );

        for (const res of results) {
          if (res.status === "fulfilled") {
            const { key, wallet, balanceData } = res.value;
            balances[key] = {
              address: wallet.address,
              label: CHAIN_REGISTRY[key]?.label,
              network: CHAIN_REGISTRY[key]?.network,
              ...balanceData,
            };
          } else {
            // Should not happen often since fetchChainBalances catches internally
            const idx = results.indexOf(res);
            const [key, wallet] = entries[idx];
            balances[key] = {
              address: wallet.address,
              label: CHAIN_REGISTRY[key]?.label,
              network: CHAIN_REGISTRY[key]?.network,
              native_balance: "0",
              usdc_balance: "0",
              error: res.reason instanceof Error ? res.reason.message : "Failed",
            };
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

        if (!chainInfo.caip2) return jsonError(`No CAIP-2 identifier for ${chainKey}`);

        const txResult = await privyFetch(
          `/wallets/${wallet.id}/rpc`,
          "POST",
          PRIVY_APP_ID,
          PRIVY_APP_SECRET,
          {
            method: "eth_sendTransaction",
            caip2: chainInfo.caip2,
            params: {
              transaction: {
                to: body.to,
                value: body.value,
              },
            },
          }
        );
        const nativeTxHash = txResult.data?.hash || txResult.hash;

        // Record transaction
        try {
          const weiValue = body.value.startsWith("0x") ? BigInt(body.value) : BigInt(body.value);
          const readableAmount = (Number(weiValue) / 1e18).toString();
          await serviceClient.from("wallet_transactions").insert({
            agent_id: agent.id,
            chain: chainKey,
            token_type: "native",
            from_address: wallet.address,
            to_address: body.to,
            amount: readableAmount,
            tx_hash: nativeTxHash || null,
            status: "success",
          });
        } catch (e) {
          console.error("Failed to record native tx:", e);
        }

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
        if (!chainInfo.caip2) return jsonError(`No CAIP-2 identifier for ${chainKey}`);

        const parts = body.amount.toString().split(".");
        const whole = parts[0] || "0";
        const frac = (parts[1] || "").padEnd(6, "0").slice(0, 6);
        const rawAmount = (BigInt(whole) * BigInt(1_000_000) + BigInt(frac)).toString();

        const calldata = ERC20_TRANSFER_SIG +
          padAddress(body.to).replace("0x", "") +
          encodeUint256(rawAmount);

        const txResult = await privyFetch(
          `/wallets/${wallet.id}/rpc`,
          "POST",
          PRIVY_APP_ID,
          PRIVY_APP_SECRET,
          {
            method: "eth_sendTransaction",
            caip2: chainInfo.caip2,
            params: {
              transaction: {
                to: usdcAddress,
                data: calldata,
                value: "0x0",
              },
            },
          }
        );
        const usdcTxHash = txResult.data?.hash || txResult.hash;

        // Record USDC transaction
        try {
          await serviceClient.from("wallet_transactions").insert({
            agent_id: agent.id,
            chain: chainKey,
            token_type: "usdc",
            from_address: wallet.address,
            to_address: body.to,
            amount: body.amount,
            tx_hash: usdcTxHash || null,
            status: "success",
          });
        } catch (e) {
          console.error("Failed to record USDC tx:", e);
        }

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
        const chainInfo = CHAIN_REGISTRY[chainKey];

        if (!wallet) return jsonError(`No Solana wallet found for ${chainKey}. Create one first.`);

        if (body.transaction) {
          // Step 1: Sign-only via Privy (NOT signAndSendTransaction — causes blockhash mismatch)
          const signResult = await privyFetch(
            `/wallets/${wallet.id}/rpc`,
            "POST",
            PRIVY_APP_ID,
            PRIVY_APP_SECRET,
            {
              method: "signTransaction",
              params: {
                transaction: body.transaction,
                encoding: "base64",
              },
            }
          );

          const signedTxBase64 = signResult.data?.signed_transaction || signResult.signed_transaction;
          if (!signedTxBase64) {
            return jsonError("No signed transaction returned from Privy");
          }

          // Step 2: Broadcast via RPC
          const solConfig = SOLANA_NETWORKS[chainKey];
          if (!solConfig) return jsonError(`No Solana RPC config for ${chainKey}`);

          const signedTxBytes = Uint8Array.from(atob(signedTxBase64), c => c.charCodeAt(0));
          const bs58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
          // Simple base58 encode for sendTransaction
          let num = BigInt(0);
          for (const byte of signedTxBytes) {
            num = num * BigInt(256) + BigInt(byte);
          }
          let bs58 = "";
          while (num > 0) {
            const remainder = Number(num % BigInt(58));
            bs58 = bs58Chars[remainder] + bs58;
            num = num / BigInt(58);
          }
          // Handle leading zeros
          for (const byte of signedTxBytes) {
            if (byte === 0) bs58 = "1" + bs58;
            else break;
          }

          const broadcastRes = await fetch(solConfig.rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "sendTransaction",
              params: [bs58, { encoding: "base58", skipPreflight: false, preflightCommitment: "processed" }],
            }),
          });

          const broadcastData = await broadcastRes.json();
          if (broadcastData.error) {
            return jsonError(`Solana broadcast error: ${JSON.stringify(broadcastData.error)}`);
          }

          const txHash = broadcastData.result;

          // Record transaction (use optional metadata from body for better history)
          try {
            await serviceClient.from("wallet_transactions").insert({
              agent_id: agent.id,
              chain: chainKey,
              token_type: body.token_type || "native",
              from_address: wallet.address,
              to_address: body.to_address || "solana_tx",
              amount: body.amount || "0",
              tx_hash: txHash || null,
              status: "success",
            });
          } catch (e) {
            console.error("Failed to record SOL tx:", e);
          }

          result = { chain: chainKey, network: chainInfo?.network, txHash, data: { hash: txHash } };
        } else if (body.to_address && body.amount) {
          // ── Server-side transaction building (avoids browser CORS/403 issues) ──
          const solConfig = SOLANA_NETWORKS[chainKey];
          if (!solConfig) return jsonError(`No Solana RPC config for ${chainKey}`);

          const rpcUrl = solConfig.rpcUrl;
          const tokenType = body.token_type || "native";
          const toAddress = body.to_address as string;
          const amount = body.amount as string;

          const connection = new Connection(rpcUrl, "processed");
          const fromPubkey = new PublicKey(wallet.address);
          const toPubkey = new PublicKey(toAddress);

          const { blockhash } = await connection.getLatestBlockhash("processed");

          const transaction = new Transaction();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = fromPubkey;

          if (tokenType === "usdc") {
            // SPL USDC transfer
            const usdcMintPubkey = new PublicKey(solConfig.usdcMint);
            const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
            const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

            // Compute ATAs
            const [fromAta] = PublicKey.findProgramAddressSync(
              [fromPubkey.toBytes(), TOKEN_PROGRAM.toBytes(), usdcMintPubkey.toBytes()],
              ATA_PROGRAM
            );
            const [toAta] = PublicKey.findProgramAddressSync(
              [toPubkey.toBytes(), TOKEN_PROGRAM.toBytes(), usdcMintPubkey.toBytes()],
              ATA_PROGRAM
            );

            // Check if recipient ATA exists
            const toAtaInfo = await connection.getAccountInfo(toAta);
            if (!toAtaInfo) {
              // Create ATA instruction
              transaction.add(new TransactionInstruction({
                programId: ATA_PROGRAM,
                keys: [
                  { pubkey: fromPubkey, isSigner: true, isWritable: true },
                  { pubkey: toAta, isSigner: false, isWritable: true },
                  { pubkey: toPubkey, isSigner: false, isWritable: false },
                  { pubkey: usdcMintPubkey, isSigner: false, isWritable: false },
                  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                  { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                ],
                data: Buffer.alloc(0),
              }));
            }

            // TransferChecked instruction
            const decimals = 6;
            const rawAmount = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));
            const transferData = Buffer.alloc(10);
            transferData.writeUInt8(12, 0); // TransferChecked opcode
            transferData.writeBigUInt64LE(rawAmount, 1);
            transferData.writeUInt8(decimals, 9);

            transaction.add(new TransactionInstruction({
              programId: TOKEN_PROGRAM,
              keys: [
                { pubkey: fromAta, isSigner: false, isWritable: true },
                { pubkey: usdcMintPubkey, isSigner: false, isWritable: false },
                { pubkey: toAta, isSigner: false, isWritable: true },
                { pubkey: fromPubkey, isSigner: true, isWritable: false },
              ],
              data: transferData,
            }));
          } else {
            // Native SOL transfer
            const lamports = Math.floor(parseFloat(amount) * 1_000_000_000);
            transaction.add(
              SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
            );
          }

          const serialized = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          });
          const txBase64 = Buffer.from(serialized).toString("base64");

          // Sign via Privy
          const signResult = await privyFetch(
            `/wallets/${wallet.id}/rpc`,
            "POST",
            PRIVY_APP_ID,
            PRIVY_APP_SECRET,
            {
              method: "signTransaction",
              params: { transaction: txBase64, encoding: "base64" },
            }
          );

          const signedTxBase64 = signResult.data?.signed_transaction || signResult.signed_transaction;
          if (!signedTxBase64) {
            return jsonError("No signed transaction returned from Privy");
          }

          // Broadcast using base64 encoding (avoids base58 conversion)
          const broadcastRes = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "sendTransaction",
              params: [signedTxBase64, { encoding: "base64", skipPreflight: false, preflightCommitment: "processed" }],
            }),
          });

          const broadcastData = await broadcastRes.json();
          if (broadcastData.error) {
            return jsonError(`Solana broadcast error: ${JSON.stringify(broadcastData.error)}`);
          }

          const txHash = broadcastData.result;

          // Record transaction
          try {
            await serviceClient.from("wallet_transactions").insert({
              agent_id: agent.id,
              chain: chainKey,
              token_type: tokenType,
              from_address: wallet.address,
              to_address: toAddress,
              amount: amount,
              tx_hash: txHash || null,
              status: "success",
            });
          } catch (e) {
            console.error("Failed to record SOL tx:", e);
          }

          result = { chain: chainKey, network: chainInfo?.network, txHash, data: { hash: txHash } };
        } else {
          return jsonError("Provide either a serialized 'transaction' or 'to_address' and 'amount' parameters");
        }
        break;
      }

      // ─── SIGN MESSAGE ───────────────────────────────────────────
      case "sign_message": {
        const chainKey = resolveChainKey(body.chain);
        const wallet = wallets[chainKey];
        const chainInfoSign = CHAIN_REGISTRY[chainKey];

        if (!wallet || !body.message) return jsonError("Wallet not found or message missing");

        if (wallet.chain_type === "ethereum") {
          if (!chainInfoSign?.caip2) return jsonError(`No CAIP-2 identifier for ${chainKey}`);
          const signResult = await privyFetch(
            `/wallets/${wallet.id}/rpc`,
            "POST",
            PRIVY_APP_ID,
            PRIVY_APP_SECRET,
            { method: "personal_sign", caip2: chainInfoSign.caip2, params: { message: body.message } }
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
