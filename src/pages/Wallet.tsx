import { useEffect, useState, useCallback, useMemo } from "react";
import { Wallet, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalletBalanceCard, WalletGroup } from "@/components/wallet/WalletBalanceCard";
import { SendTokenForm } from "@/components/wallet/SendTokenForm";
import { CreateWalletPanel } from "@/components/wallet/CreateWalletPanel";
import { TransactionHistory } from "@/components/wallet/TransactionHistory";
import { useAgentWallet, WalletInfo, BalanceInfo } from "@/hooks/useAgentWallet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Maps each chain key to its family name
const CHAIN_TO_FAMILY: Record<string, string> = {
  base_sepolia: "base",
  base: "base",
  solana_devnet: "solana",
  solana: "solana",
  story_aeneid: "story",
  story: "story",
};

const FAMILY_ORDER = ["base", "solana", "story"];

function groupWallets(wallets: WalletInfo[]): WalletGroup[] {
  const families: Record<string, WalletGroup> = {};

  for (const w of wallets) {
    const family = CHAIN_TO_FAMILY[w.chain] || w.chain;
    if (!families[family]) {
      families[family] = { family, address: w.address };
    }
    if (w.network === "testnet") {
      families[family].testnet = w;
    } else {
      families[family].mainnet = w;
    }
  }

  return FAMILY_ORDER
    .filter((f) => families[f])
    .map((f) => families[f]);
}

const WalletPage = () => {
  const {
    loading,
    error,
    getWallets,
    getAllBalances,
    createWallet,
    createAllWallets,
    sendNativeToken,
    sendUsdc,
    sendSol,
  } = useAgentWallet();

  const { user } = useAuth();

  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [balances, setBalances] = useState<Record<string, BalanceInfo>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [txRefreshKey, setTxRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    const walletsRes = await getWallets();
    if (walletsRes?.wallets) {
      setWallets(walletsRes.wallets);

      if (walletsRes.wallets.length > 0) {
        const balancesRes = await getAllBalances();
        if (balancesRes?.balances) {
          setBalances(balancesRes.balances as Record<string, BalanceInfo>);
        }
      }
    }
    setInitialLoading(false);
  }, [getWallets, getAllBalances]);

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch agent ID for transaction history
  useEffect(() => {
    if (!user) return;
    supabase
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setAgentId(data.id);
      });
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCreateWallet = async (chain: string) => {
    const res = await createWallet(chain);
    if (res) await fetchData();
    return res;
  };

  const handleCreateAll = async (network: "testnet" | "mainnet") => {
    const res = await createAllWallets(network);
    if (res) await fetchData();
    return res;
  };

  const handleSendNative = async (chain: string, to: string, value: string) => {
    const res = await sendNativeToken(chain, to, value);
    if (res) {
      toast({ title: "Transaction submitted" });
      await fetchData();
      setTxRefreshKey((k) => k + 1);
    }
    return res;
  };

  const handleSendUsdc = async (chain: string, to: string, amount: string) => {
    const res = await sendUsdc(chain, to, amount);
    if (res) {
      toast({ title: "USDC transaction submitted" });
      await fetchData();
      setTxRefreshKey((k) => k + 1);
    }
    return res;
  };

  const handleSendSol = async (chain: string, transaction: string, meta?: { token_type?: string; to_address?: string; amount?: string }) => {
    const res = await sendSol(chain, transaction, meta);
    if (res) {
      toast({ title: meta?.token_type === "usdc" ? "USDC transaction submitted" : "SOL transaction submitted" });
      await fetchData();
      setTxRefreshKey((k) => k + 1);
    }
    return res;
  };

  const existingChains = wallets.map((w) => w.chain);
  const walletGroups = useMemo(() => groupWallets(wallets), [wallets]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Agent Wallets</h1>
            <p className="text-sm text-muted-foreground">
              Multi-chain wallet management via Privy server wallets
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Create wallets if missing */}
      <CreateWalletPanel
        onCreateAll={handleCreateAll}
        onCreate={handleCreateWallet}
        loading={loading}
        existingChains={existingChains}
      />

      {/* Grouped wallet cards */}
      {walletGroups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {walletGroups.map((group) => (
            <WalletBalanceCard
              key={group.family}
              group={group}
              balances={balances}
              balanceLoading={refreshing}
            />
          ))}
        </div>
      )}

      {/* Send forms */}
      {wallets.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SendTokenForm
            wallets={wallets}
            onSendNative={handleSendNative}
            onSendUsdc={handleSendUsdc}
            onSendSol={handleSendSol}
            loading={loading}
          />
        </div>
      )}

      {/* Transaction History */}
      <TransactionHistory agentId={agentId} refreshKey={txRefreshKey} />

      {/* Empty state */}
      {wallets.length === 0 && !initialLoading && (
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground">No wallets yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first agent wallet above to get started.
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletPage;
