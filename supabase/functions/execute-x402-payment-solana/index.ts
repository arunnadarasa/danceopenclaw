import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "https://esm.sh/@solana/web3.js@1.95.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOLANA_NETWORKS = {
  mainnet: {
    rpcUrl: Deno.env.get("SOLANA_MAINNET_RPC_URL") || "https://api.mainnet-beta.solana.com",
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    network: "solana",
    walletChainKey: "solana",
  },
  testnet: {
    rpcUrl: "https://api.devnet.solana.com",
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    network: "solana-devnet",
    walletChainKey: "solana_devnet",
  },
} as const;

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const COMPUTE_BUDGET_PROGRAM_ID = new PublicKey(
  "ComputeBudget111111111111111111111111111111"
);

function getAssociatedTokenAddress(
  walletAddress: PublicKey,
  mintAddress: PublicKey
): PublicKey {
  const ATA_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );
  const [address] = PublicKey.findProgramAddressSync(
    [
      walletAddress.toBytes(),
      TOKEN_PROGRAM_ID.toBytes(),
      mintAddress.toBytes(),
    ],
    ATA_PROGRAM_ID
  );
  return address;
}

function createSetComputeUnitLimitInstruction(
  units: number
): TransactionInstruction {
  const data = Buffer.alloc(5);
  data.writeUInt8(2, 0);
  data.writeUInt32LE(units, 1);
  return new TransactionInstruction({
    keys: [],
    programId: COMPUTE_BUDGET_PROGRAM_ID,
    data: data as never,
  });
}

function createSetComputeUnitPriceInstruction(
  microLamports: bigint
): TransactionInstruction {
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0);
  data.writeBigUInt64LE(microLamports, 1);
  return new TransactionInstruction({
    keys: [],
    programId: COMPUTE_BUDGET_PROGRAM_ID,
    data: data as never,
  });
}

function createTransferCheckedInstruction(
  sourceAta: PublicKey,
  mint: PublicKey,
  destAta: PublicKey,
  owner: PublicKey,
  amount: bigint,
  decimals: number
): TransactionInstruction {
  const data = Buffer.alloc(10);
  data.writeUInt8(12, 0); // TransferChecked instruction index
  data.writeBigUInt64LE(amount, 1);
  data.writeUInt8(decimals, 9);
  return new TransactionInstruction({
    keys: [
      { pubkey: sourceAta, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destAta, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_PROGRAM_ID,
    data: data as never,
  });
}

async function getUsdcBalance(
  connection: Connection,
  walletAddress: PublicKey,
  usdcMint: PublicKey
): Promise<bigint> {
  const ata = getAssociatedTokenAddress(walletAddress, usdcMint);
  try {
    const accountInfo = await connection.getAccountInfo(ata);
    if (!accountInfo) return BigInt(0);
    return accountInfo.data.readBigUInt64LE(64);
  } catch {
    return BigInt(0);
  }
}

async function signSolanaTransaction(
  walletId: string,
  transactionBase64: string,
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
        method: "signTransaction",
        params: { transaction: transactionBase64, encoding: "base64" },
      }),
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Privy signing failed: ${response.status} - ${error}`);
  }
  const result = await response.json();
  return result.data.signed_transaction;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

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

    if (!agentId || !targetUrl)
      return new Response(
        JSON.stringify({ error: "agentId and targetUrl required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    if (network !== "mainnet" && network !== "testnet")
      return new Response(
        JSON.stringify({ error: "network must be 'mainnet' or 'testnet'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    const networkConfig =
      SOLANA_NETWORKS[network as keyof typeof SOLANA_NETWORKS];

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
          error: `No Solana wallet found for ${networkConfig.walletChainKey}. Create one first.`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const walletPubkey = new PublicKey(wallet.address);
    const usdcMint = new PublicKey(networkConfig.usdcMint);
    const connection = new Connection(networkConfig.rpcUrl, "confirmed");

    // Step 1: Initial request
    const initialResponse = await fetch(targetUrl, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (initialResponse.status !== 402) {
      return new Response(
        JSON.stringify({
          status: initialResponse.status,
          paymentRequired: false,
          data: await initialResponse.text(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Parse 402
    let paymentInfo: { accepts: PaymentAccept[]; x402Version?: number };
    try {
      paymentInfo = await initialResponse.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid x402 JSON" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    if (!paymentInfo.accepts?.length)
      return new Response(
        JSON.stringify({ error: "No payment options" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    const usdcOption = paymentInfo.accepts.find(
      (a: PaymentAccept) =>
        a.asset?.toLowerCase() === networkConfig.usdcMint.toLowerCase() ||
        a.network === networkConfig.network
    );
    if (!usdcOption)
      return new Response(
        JSON.stringify({ error: "No Solana USDC option found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    // CRITICAL: Get facilitator fee payer from 402 response
    const facilitatorFeePayer = usdcOption.extra?.feePayer as string;
    if (!facilitatorFeePayer)
      return new Response(
        JSON.stringify({
          error: "No feePayer in payment requirements",
          hint: "Pay AI Solana requires extra.feePayer",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    const facilitatorPubkey = new PublicKey(facilitatorFeePayer);

    // Step 3: Amount validation
    const amountStr =
      usdcOption.amount || usdcOption.maxAmount || usdcOption.maxAmountRequired;
    if (!amountStr)
      return new Response(
        JSON.stringify({ error: "No amount in payment option" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    const requiredAmount = BigInt(amountStr);
    if (requiredAmount > BigInt(Math.floor(parseFloat(maxAmount) * 1e6)))
      return new Response(
        JSON.stringify({ error: "Exceeds max amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    // Step 4: Balance check
    const balance = await getUsdcBalance(connection, walletPubkey, usdcMint);
    if (balance < requiredAmount)
      return new Response(
        JSON.stringify({
          error: "Insufficient USDC",
          required: amountStr,
          balance: balance.toString(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    // Step 5: Build transaction — EXACTLY 3 instructions
    const recipientPubkey = new PublicKey(usdcOption.payTo);
    const sourceAta = getAssociatedTokenAddress(walletPubkey, usdcMint);
    const destAta = getAssociatedTokenAddress(recipientPubkey, usdcMint);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const transaction = new Transaction();
    transaction.add(createSetComputeUnitLimitInstruction(10000));
    transaction.add(createSetComputeUnitPriceInstruction(BigInt(1000)));
    transaction.add(
      createTransferCheckedInstruction(
        sourceAta,
        usdcMint,
        destAta,
        walletPubkey,
        requiredAmount,
        6
      )
    );
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = facilitatorPubkey; // Facilitator pays gas!

    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    const txBase64 = Buffer.from(serializedTx).toString("base64");

    // Step 6: Partial sign with Privy
    const signedTxBase64 = await signSolanaTransaction(
      wallet.id,
      txBase64,
      privyAppId,
      privyAppSecret
    );

    // Step 7: Build payload
    const x402Version = paymentInfo.x402Version || 1;
    let paymentPayload;
    if (x402Version >= 2) {
      paymentPayload = {
        x402Version: 2,
        resource: {
          url: targetUrl,
          description: usdcOption.description || "x402 payment",
          mimeType: "application/json",
        },
        accepted: {
          scheme: usdcOption.scheme || "exact",
          network: usdcOption.network,
          amount: requiredAmount.toString(),
          asset: usdcOption.asset,
          payTo: usdcOption.payTo,
          maxTimeoutSeconds: usdcOption.maxTimeoutSeconds || 60,
          extra: usdcOption.extra || {},
        },
        payload: { transaction: signedTxBase64 },
      };
    } else {
      paymentPayload = {
        x402Version: 1,
        scheme: "exact",
        network: usdcOption.network,
        payload: { transaction: signedTxBase64 },
      };
    }

    const xPaymentHeader = btoa(JSON.stringify(paymentPayload));

    // Step 8: Record + retry
    const { data: payment } = await supabase
      .from("agent_payments")
      .insert({
        agent_id: agentId,
        wallet_address: wallet.address,
        recipient_address: usdcOption.payTo,
        amount: (Number(requiredAmount) / 1e6).toFixed(6),
        network: networkConfig.network,
        target_url: targetUrl,
        status: "pending",
      })
      .select()
      .single();

    const headerName =
      x402Version >= 2 ? "PAYMENT-SIGNATURE" : "X-PAYMENT";
    const paymentResponse = await fetch(targetUrl, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        [headerName]: xPaymentHeader,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await paymentResponse.text();
    const xPaymentResponse = paymentResponse.headers.get(
      "X-PAYMENT-RESPONSE"
    );

    // Step 9: Update record
    if (payment) {
      let txHash = null;
      if (xPaymentResponse) {
        try {
          const d = JSON.parse(atob(xPaymentResponse));
          txHash = d.txHash || d.signature || d.transaction;
        } catch {
          // ignore
        }
      }
      let errorMessage = `HTTP ${paymentResponse.status}`;
      if (!paymentResponse.ok) {
        try {
          const p = JSON.parse(responseData);
          errorMessage = p.error || p.message || errorMessage;
        } catch {
          // ignore
        }
      }
      await supabase
        .from("agent_payments")
        .update({
          status: paymentResponse.ok ? "success" : "failed",
          tx_hash: txHash,
          error_message: paymentResponse.ok ? null : errorMessage,
        })
        .eq("id", payment.id);
    }

    return new Response(
      JSON.stringify({
        status: paymentResponse.status,
        paymentRequired: true,
        paymentExecuted: paymentResponse.ok,
        paymentAmount: (Number(requiredAmount) / 1e6).toFixed(6),
        recipient: usdcOption.payTo,
        network: networkConfig.network,
        data: responseData,
        xPaymentResponse,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in execute-x402-payment-solana:", error);
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

// Type used for parsing 402 response
interface PaymentAccept {
  scheme: string;
  network: string;
  maxAmountRequired?: string;
  maxAmount?: string;
  amount?: string;
  description?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
  asset: string;
  extra?: Record<string, unknown>;
  payTo: string;
}
