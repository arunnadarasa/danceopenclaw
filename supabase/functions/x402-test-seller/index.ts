// x402 test seller - self-hosted paid content endpoint for Story Network

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, payment-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
};

// Story mainnet USDC.e (Bridged USDC via Stargate)
const USDC_E_ADDRESS = "0xF1815bd50389c46847f0Bda824eC8da914045D14";

// A recipient address for the test seller - this is a burn/test address
const DEFAULT_PAY_TO = "0x000000000000000000000000000000000000dEaD";

// Story facilitator for on-chain settlement
const STORY_FACILITATOR_URL =
  "https://wnpqmryjrhuobxxlipti.supabase.co/functions/v1/x402-settle";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const network = url.searchParams.get("network") || "story-mainnet";
    const price = url.searchParams.get("price") || "0.000001";

    // Convert human-readable price to micro-units (6 decimals)
    const amountMicro = Math.round(parseFloat(price) * 1e6).toString();

    // Check for payment signature header
    const paymentSignature =
      req.headers.get("payment-signature") ||
      req.headers.get("PAYMENT-SIGNATURE");

    if (!paymentSignature) {
      // No payment — return 402 with payment requirements
      const paymentRequirements = {
        x402Version: 2,
        accepts: [
          {
            scheme: "exact",
            network: "story",
            asset: USDC_E_ADDRESS,
            payTo: DEFAULT_PAY_TO,
            amount: amountMicro,
            maxTimeoutSeconds: 300,
            extra: {
              name: "Bridged USDC (Stargate)",
              version: "2",
            },
          },
        ],
        error: "Payment Required",
      };

      return new Response(JSON.stringify(paymentRequirements), {
        status: 402,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // Payment signature present — decode and settle
    console.log("Payment signature received, decoding...");

    let paymentPayload;
    try {
      paymentPayload = JSON.parse(atob(paymentSignature));
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid payment signature encoding" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const auth = paymentPayload?.payload?.authorization;
    const signature = paymentPayload?.payload?.signature;

    if (!auth || !signature) {
      return new Response(
        JSON.stringify({
          error: "Missing authorization or signature in payment payload",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Story facilitator expects flat settlement body
    const settleBody = {
      from: auth.from,
      to: auth.to,
      value: auth.value,
      validAfter: auth.validAfter,
      validBefore: auth.validBefore,
      nonce: auth.nonce,
      signature: signature,
    };

    console.log("Forwarding to Story facilitator:", JSON.stringify(settleBody));

    const settleResponse = await fetch(STORY_FACILITATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settleBody),
    });

    const settleText = await settleResponse.text();
    console.log(
      `Facilitator responded: ${settleResponse.status} - ${settleText}`
    );

    if (!settleResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Settlement failed",
          facilitatorStatus: settleResponse.status,
          facilitatorResponse: settleText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse facilitator response for txHash
    let settleData;
    try {
      settleData = JSON.parse(settleText);
    } catch {
      settleData = { raw: settleText };
    }

    const txHash =
      settleData.txHash ||
      settleData.transactionHash ||
      settleData.transaction ||
      null;

    // Build X-PAYMENT-RESPONSE header
    const paymentResponse = btoa(
      JSON.stringify({
        txHash,
        network: "story",
        success: true,
      })
    );

    // Return premium content
    const premiumContent = {
      message: "🎉 Payment settled! Here is your premium content.",
      content:
        "This is exclusive content unlocked via x402 payment on Story Network.",
      network: "story-mainnet",
      txHash,
      settledAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(premiumContent), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-PAYMENT-RESPONSE": paymentResponse,
      },
    });
  } catch (e) {
    console.error("x402-test-seller error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
