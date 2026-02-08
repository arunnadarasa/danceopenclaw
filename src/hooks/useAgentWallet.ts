import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WalletInfo {
  chain: string;
  label: string;
  network: "testnet" | "mainnet" | "unknown";
  id: string;
  address: string;
  chain_type: string;
}

export interface ChainInfo {
  key: string;
  label: string;
  chain_type: string;
  chain_id?: number;
  network: "testnet" | "mainnet";
  has_usdc: boolean;
}

export interface BalanceInfo {
  address: string;
  label: string;
  network: string;
  native_balance?: string;
  usdc_balance?: string;
  error?: string;
}

async function callWallet(action: string, params: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await supabase.functions.invoke("agent-wallet", {
    body: { action, ...params },
  });

  if (res.error) {
    let msg = res.error.message;
    try {
      const body = await res.error.context?.json?.();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.data;
}

export function useAgentWallet() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrap = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWallets = useCallback(() =>
    wrap<{ wallets: WalletInfo[] }>(() => callWallet("get_wallets")), [wrap]);

  const listChains = useCallback(() =>
    wrap<{ chains: ChainInfo[] }>(() => callWallet("list_chains")), [wrap]);

  const getAllBalances = useCallback(() =>
    wrap<{ balances: Record<string, BalanceInfo> }>(() => callWallet("get_all_balances")), [wrap]);

  const createWallet = useCallback((chain: string) =>
    wrap(() => callWallet("create_wallet", { chain })), [wrap]);

  const createAllWallets = useCallback((network: "testnet" | "mainnet") =>
    wrap(() => callWallet("create_all_wallets", { network })), [wrap]);

  const sendNativeToken = useCallback((chain: string, to: string, value: string) =>
    wrap(() => callWallet("send_native_token", { chain, to, value })), [wrap]);

  const sendUsdc = useCallback((chain: string, to: string, amount: string) =>
    wrap(() => callWallet("send_usdc", { chain, to, amount })), [wrap]);

  const sendSol = useCallback((chain: string, transaction: string, meta?: { token_type?: string; to_address?: string; amount?: string }) =>
    wrap(() => callWallet("send_sol", { chain, transaction, ...(meta || {}) })), [wrap]);

  return {
    loading,
    error,
    getWallets,
    listChains,
    getAllBalances,
    createWallet,
    createAllWallets,
    sendNativeToken,
    sendUsdc,
    sendSol,
  };
}
