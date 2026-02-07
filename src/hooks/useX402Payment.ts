import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface X402PaymentParams {
  agentId: string;
  targetUrl: string;
  network: "testnet" | "mainnet" | "story-mainnet" | "solana-testnet" | "solana-mainnet";
  maxAmount?: string;
  method?: string;
  body?: unknown;
}

export interface X402PaymentResult {
  status: number;
  paymentRequired: boolean;
  paymentExecuted?: boolean;
  paymentAmount?: string;
  recipient?: string;
  network?: string;
  data?: string;
  xPaymentResponse?: string;
  error?: string;
}

export function useX402Payment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<X402PaymentResult | null>(null);

  const executePayment = useCallback(async (params: X402PaymentParams): Promise<X402PaymentResult | null> => {
    setLoading(true);
    setError(null);
    setLastResult(null);

    try {
      const isSolana = params.network === "solana-testnet" || params.network === "solana-mainnet";
      const functionName = isSolana ? "execute-x402-payment-solana" : "execute-x402-payment";

      // Map network names for the edge functions
      let edgeNetwork: string;
      if (params.network === "solana-testnet") edgeNetwork = "testnet";
      else if (params.network === "solana-mainnet") edgeNetwork = "mainnet";
      else edgeNetwork = params.network;

      const { data, error: fnError } = await supabase.functions.invoke(functionName, {
        body: {
          agentId: params.agentId,
          targetUrl: params.targetUrl,
          network: edgeNetwork,
          maxAmount: params.maxAmount || "1.00",
          method: params.method || "GET",
          body: params.body,
        },
      });

      if (fnError) {
        const msg = fnError.message || "Payment function failed";
        setError(msg);
        return null;
      }

      const result = data as X402PaymentResult;
      setLastResult(result);

      if (result.error) {
        setError(result.error);
      }

      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { executePayment, loading, error, lastResult };
}
