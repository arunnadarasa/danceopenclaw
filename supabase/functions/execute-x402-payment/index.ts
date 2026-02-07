import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Network configuration with domain info for EIP-712 signing
const NETWORKS = {
  mainnet: {
    chainId: 8453,
    chainKey: "base",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    rpcUrl: "https://mainnet.base.org",
    domainName: "USD Coin",
    domainVersion: "2",
    walletChainKey: "base",
  },
  testnet: {
    chainId: 84532,
    chainKey: "base_sepolia",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    rpcUrl: "https://sepolia.base.org",
    domainName: "USDC",
    domainVersion: "2",
    walletChainKey: "base_sepolia",
  },
  "story-mainnet": {
    chainId: 1514,
    chainKey: "story",
    usdcAddress: "0xF1815bd50389c46847f0Bda824eC8da914045D14",
    rpcUrl: "https://mainnet.storyrpc.io",
    domainName: "Bridged USDC (Stargate)",
    domainVersion: "2",
    walletChainKey: "story",
  },
} as const;

const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

interface PaymentAccept {
  scheme: string;
  network: string;
  maxAmountRequired?: string;
  maxAmount?: string;
  amount?: string;
  resource: string;
  description?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
  asset: string;
  extra?: Record<string, unknown>;
  payTo: string;
}

interface X402Response {
  accepts: PaymentAccept[];
  error?: string;
  x402Version?: number;
}

function generateRandomNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return "0x" + Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getUsdcBalance(
  address: string,
  network: keyof typeof NETWORKS
): Promise<bigint> {
  const config = NETWORKS[network];
  const balanceOfSelector = "0x70a08231";
  const paddedAddress = address.toLowerCase().replace("0x", "").padStart(64, "0");

  const response = await fetch(config.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        { to: config.usdcAddress, data: balanceOfSelector + paddedAddress },
        "latest",
      ],
    }),
  });

  const result = await response.json();
  if (result.error) throw new Error(`RPC error: ${result.error.message}`);
  return BigInt(result.result || "0x0");
}

async function signWithPrivy(
  walletId: string,
  typedData: object,
  privyAppId: string,
  privyAppSecret: string
): Promise<string> {
  const response = await fetch(
    `https://api.privy.io/v1/wallets/${walletId}/rpc`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "privy-app-id": privyAppId,
        Authorization: `Basic ${btoa(`${privyAppId}:${privyAppSecret}`)}`,
      },
      body: JSON.stringify({
        method: "eth_signTypedData_v4",
        params: { typed_data: typedData },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Privy signing failed: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.data.signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const privyAppId = Deno.env.get("PRIVY_APP_ID");
    const privyAppSecret = Deno.env.get("PRIVY_APP_SECRET");

    if (!privyAppId || !privyAppSecret) {
      return new Response(
        JSON.stringify({ error: "Privy credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const {
      agentId,
      targetUrl,
      method = "GET",
      body,
      maxAmount = "1.00",
      network = "testnet",
    } = await req.json();

    if (!agentId || !targetUrl) {
      return new Response(
        JSON.stringify({ error: "agentId and targetUrl are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (
      network !== "mainnet" &&
      network !== "testnet" &&
      network !== "story-mainnet"
    ) {
      return new Response(
        JSON.stringify({
          error:
            "network must be 'mainnet', 'testnet', or 'story-mainnet'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const networkConfig = NETWORKS[network as keyof typeof NETWORKS];

    // Read wallet from agents.config.privy_wallets JSONB
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, config")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const config = (agent.config as Record<string, unknown>) || {};
    const privyWallets =
      (config.privy_wallets as Record<
        string,
        { id: string; address: string; chain_type: string }
      >) || {};

    const wallet = privyWallets[networkConfig.walletChainKey];
    if (!wallet) {
      return new Response(
        JSON.stringify({
          error: `No wallet found for ${networkConfig.walletChainKey}. Create one first.`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Make initial request to target URL
    const initialResponse = await fetch(targetUrl, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });

    if (initialResponse.status !== 402) {
      const responseData = await initialResponse.text();
      return new Response(
        JSON.stringify({
          status: initialResponse.status,
          paymentRequired: false,
          data: responseData,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Parse 402 response
    let paymentInfo: X402Response;
    try {
      paymentInfo = await initialResponse.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "402 response did not contain valid x402 JSON",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!paymentInfo.accepts || paymentInfo.accepts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No payment options in 402 response" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const usdcOption = paymentInfo.accepts.find(
      (a) =>
        a.asset?.toLowerCase() === networkConfig.usdcAddress.toLowerCase()
    );

    if (!usdcOption) {
      return new Response(
        JSON.stringify({
          error: "No matching USDC payment option found",
          availableOptions: paymentInfo.accepts,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Validate amount
    const amountStr =
      usdcOption.amount || usdcOption.maxAmount || usdcOption.maxAmountRequired;
    if (!amountStr) {
      return new Response(
        JSON.stringify({ error: "No amount found in payment option" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const requiredAmount = BigInt(amountStr);
    const maxAmountWei = BigInt(Math.floor(parseFloat(maxAmount) * 1e6));

    if (requiredAmount > maxAmountWei) {
      return new Response(
        JSON.stringify({
          error: "Payment amount exceeds max allowed",
          required: amountStr,
          maxAllowed: maxAmountWei.toString(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Check USDC balance
    const balance = await getUsdcBalance(wallet.address, network);
    if (balance < requiredAmount) {
      return new Response(
        JSON.stringify({
          error: "Insufficient USDC balance",
          required: amountStr,
          balance: balance.toString(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Build EIP-3009 typed data
    const nonce = generateRandomNonce();
    const now = Math.floor(Date.now() / 1000);
    const validAfter = now - 60;
    const validBefore = now + (usdcOption.maxTimeoutSeconds || 300);

    const domainName =
      (usdcOption.extra?.name as string) || networkConfig.domainName;
    const domainVersion =
      (usdcOption.extra?.version as string) || networkConfig.domainVersion;

    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        ...EIP3009_TYPES,
      },
      primary_type: "TransferWithAuthorization",
      domain: {
        name: domainName,
        version: domainVersion,
        chainId: networkConfig.chainId,
        verifyingContract: networkConfig.usdcAddress,
      },
      message: {
        from: wallet.address,
        to: usdcOption.payTo,
        value: amountStr,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    };

    // Step 6: Sign with Privy
    const signature = await signWithPrivy(
      wallet.id,
      typedData,
      privyAppId,
      privyAppSecret
    );

    // Step 7: Build payment payload (version-aware)
    const x402Version = paymentInfo.x402Version || 1;
    let paymentPayload;

    if (x402Version >= 2) {
      paymentPayload = {
        x402Version: 2,
        resource: {
          url: targetUrl,
          description: usdcOption.description || "x402 payment",
          mimeType: usdcOption.mimeType || "application/json",
        },
        accepted: {
          scheme: usdcOption.scheme || "exact",
          network: usdcOption.network,
          amount: amountStr,
          asset: usdcOption.asset,
          payTo: usdcOption.payTo,
          maxTimeoutSeconds: usdcOption.maxTimeoutSeconds || 300,
          extra: usdcOption.extra || {},
        },
        payload: {
          signature,
          authorization: {
            from: wallet.address,
            to: usdcOption.payTo,
            value: amountStr,
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
          },
        },
      };
    } else {
      paymentPayload = {
        x402Version: 1,
        scheme: "exact",
        network: usdcOption.network,
        payload: {
          signature,
          authorization: {
            from: wallet.address,
            to: usdcOption.payTo,
            value: amountStr,
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
          },
        },
      };
    }

    const xPaymentHeader = btoa(JSON.stringify(paymentPayload));

    // Step 8: Record pending payment
    const { data: payment } = await supabase
      .from("agent_payments")
      .insert({
        agent_id: agentId,
        wallet_address: wallet.address,
        recipient_address: usdcOption.payTo,
        amount: (Number(requiredAmount) / 1e6).toFixed(6),
        network,
        target_url: targetUrl,
        status: "pending",
      })
      .select()
      .single();

    // Step 9: Retry with payment header
    const paymentResponse = await fetch(targetUrl, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        "PAYMENT-SIGNATURE": xPaymentHeader,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await paymentResponse.text();
    const xPaymentResponse = paymentResponse.headers.get("X-PAYMENT-RESPONSE");

    // Step 10: Update payment record
    if (payment) {
      let txHash = null;
      if (xPaymentResponse) {
        try {
          const decoded = JSON.parse(atob(xPaymentResponse));
          txHash =
            decoded.txHash || decoded.transactionHash || decoded.transaction;
        } catch {
          // ignore decode errors
        }
      }
      await supabase
        .from("agent_payments")
        .update({
          status: paymentResponse.ok ? "success" : "failed",
          tx_hash: txHash,
          error_message: paymentResponse.ok
            ? null
            : `HTTP ${paymentResponse.status}`,
        })
        .eq("id", payment.id);
    }

    return new Response(
      JSON.stringify({
        status: paymentResponse.status,
        paymentRequired: true,
        paymentExecuted: true,
        paymentAmount: (Number(requiredAmount) / 1e6).toFixed(6),
        recipient: usdcOption.payTo,
        network,
        data: responseData,
        xPaymentResponse,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in execute-x402-payment:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
