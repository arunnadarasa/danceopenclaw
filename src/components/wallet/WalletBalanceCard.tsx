import { Copy, ExternalLink } from "lucide-react";
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

const EXPLORER_URLS: Record<string, string> = {
  base_sepolia: "https://sepolia.basescan.org/address/",
  base: "https://basescan.org/address/",
  solana_devnet: "https://explorer.solana.com/address/",
  solana: "https://explorer.solana.com/address/",
  story_aeneid: "https://aeneid.storyscan.xyz/address/",
  story: "https://storyscan.xyz/address/",
};

// Map chain keys to their family
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

  // Determine which explorer to link (prefer mainnet)
  const mainChain = group.mainnet?.chain || group.testnet?.chain || "";
  const explorerBase = EXPLORER_URLS[mainChain];

  const renderNetworkBalance = (wallet: WalletInfo | undefined, label: string) => {
    if (!wallet) return null;
    const bal = balances[wallet.chain];
    const family = CHAIN_TO_FAMILY[wallet.chain] || group.family;
    const nativeUnit = FAMILY_META[family]?.nativeUnit || "?";

    return (
      <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={wallet.network === "mainnet" ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0"
          >
            {wallet.network}
          </Badge>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-right">
          {balanceLoading ? (
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          ) : bal?.error ? (
            <span className="text-xs text-destructive">Error</span>
          ) : (
            <>
              <p className="font-display text-sm font-semibold text-foreground tabular-nums">
                {bal?.native_balance ?? "—"} {nativeUnit}
              </p>
              {bal?.usdc_balance && bal.usdc_balance !== "0" && bal.usdc_balance !== "0.00" && (
                <p className="text-xs text-muted-foreground">
                  {bal.usdc_balance} USDC
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-gradient-card border-border/50 overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${meta.colorClass} text-white`}>
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
          {renderNetworkBalance(
            group.testnet,
            group.testnet?.label || "Testnet"
          )}
          {renderNetworkBalance(
            group.mainnet,
            group.mainnet?.label || "Mainnet"
          )}
        </div>
      </CardContent>
    </Card>
  );
};
