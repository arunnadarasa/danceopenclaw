import { Copy, ExternalLink, Droplets } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { WalletInfo, BalanceInfo } from "@/hooks/useAgentWallet";

const FAMILY_META: Record<string, { icon: string; colorClass: string; label: string; nativeUnit: string }> = {
  base: { icon: "Ξ", colorClass: "bg-[hsl(var(--chain-eth))]", label: "Base", nativeUnit: "ETH" },
  solana: { icon: "◎", colorClass: "bg-[hsl(var(--chain-sol))]", label: "Solana", nativeUnit: "SOL" },
  story: { icon: "📖", colorClass: "bg-[hsl(var(--chain-story))]", label: "Story", nativeUnit: "IP" },
};

const TESTNET_FAUCETS: Record<string, { token: string; label: string; url: string }[]> = {
  base_sepolia: [
    { token: "ETH", label: "Coinbase Faucet", url: "https://portal.cdp.coinbase.com/products/faucet" },
    { token: "USDC", label: "Circle Faucet", url: "https://faucet.circle.com/" },
  ],
  solana_devnet: [
    { token: "SOL", label: "Solana Faucet", url: "https://faucet.solana.com/" },
    { token: "USDC", label: "Circle Faucet", url: "https://faucet.circle.com/" },
  ],
  story_aeneid: [
    { token: "IP", label: "Story Faucet", url: "https://faucet.story.foundation/" },
  ],
};

const EXPLORER_URLS: Record<string, string> = {
  base_sepolia: "https://sepolia.basescan.org/address/",
  base: "https://basescan.org/address/",
  solana_devnet: "https://explorer.solana.com/address/",
  solana: "https://explorer.solana.com/address/",
  story_aeneid: "https://aeneid.storyscan.xyz/address/",
  story: "https://storyscan.xyz/address/",
};

const CHAIN_TO_FAMILY: Record<string, string> = {
  base_sepolia: "base",
  base: "base",
  solana_devnet: "solana",
  solana: "solana",
  story_aeneid: "story",
  story: "story",
};

export interface WalletGroup {
  family: string;
  address: string;
  testnet?: WalletInfo;
  mainnet?: WalletInfo;
}

interface WalletBalanceCardProps {
  group: WalletGroup;
  balances: Record<string, BalanceInfo>;
  balanceLoading?: boolean;
}

export const WalletBalanceCard = ({ group, balances, balanceLoading }: WalletBalanceCardProps) => {
  const meta = FAMILY_META[group.family] || { icon: "💰", colorClass: "bg-muted", label: group.family, nativeUnit: "?" };
  const shortAddress = `${group.address.slice(0, 6)}…${group.address.slice(-4)}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(group.address);
    toast({ title: "Address copied", description: shortAddress });
  };

  const mainChain = group.mainnet?.chain || group.testnet?.chain || "";
  const explorerBase = EXPLORER_URLS[mainChain];

  const renderNetworkBalance = (wallet: WalletInfo | undefined, label: string) => {
    if (!wallet) return null;
    const bal = balances[wallet.chain];
    const family = CHAIN_TO_FAMILY[wallet.chain] || group.family;
    const nativeUnit = FAMILY_META[family]?.nativeUnit || "?";
    const faucets = wallet.network === "testnet" ? TESTNET_FAUCETS[wallet.chain] : undefined;

    return (
      <div className="rounded-lg bg-muted/40 px-3 py-2 space-y-1.5">
        {/* Row 1: badge + label + balance */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={wallet.network === "mainnet" ? "default" : "secondary"}
              className="text-[10px] px-1.5 py-0"
            >
              {wallet.network}
            </Badge>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
          <div className="text-right min-w-0">
            {balanceLoading ? (
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            ) : bal?.error ? (
              <span className="text-xs text-destructive">Error</span>
            ) : (
              <>
                <p className="font-display text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                  {bal?.native_balance ?? "—"} {nativeUnit}
                </p>
                {bal?.usdc_balance && bal.usdc_balance !== "0" && bal.usdc_balance !== "0.00" && (
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {bal.usdc_balance} USDC
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Row 2: Faucet links (testnet only) */}
        {faucets && faucets.length > 0 && (
          <div className="flex items-center gap-3 pt-0.5">
            <Droplets className="h-3 w-3 text-muted-foreground shrink-0" />
            {faucets.map((faucet) => (
              <a
                key={faucet.token}
                href={faucet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                {faucet.token} Faucet
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-gradient-card border-border/50 overflow-hidden">
      <CardContent className="p-3 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-base sm:text-lg ${meta.colorClass} text-white`}>
              {meta.icon}
            </div>
            <p className="font-display text-lg font-semibold text-foreground">{meta.label}</p>
          </div>
        </div>

        {/* Address row */}
        <div className="flex items-center gap-2 mb-4">
          <code className="flex-1 truncate rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground font-mono">
            {shortAddress}
          </code>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyAddress}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {explorerBase && (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={`${explorerBase}${group.address}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>

        {/* Network balances */}
        <div className="space-y-2">
          {renderNetworkBalance(group.testnet, group.testnet?.label || "Testnet")}
          {renderNetworkBalance(group.mainnet, group.mainnet?.label || "Mainnet")}
        </div>
      </CardContent>
    </Card>
  );
};
