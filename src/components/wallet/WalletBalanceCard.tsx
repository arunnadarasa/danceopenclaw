import { Copy, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { WalletInfo, BalanceInfo } from "@/hooks/useAgentWallet";

const CHAIN_COLORS: Record<string, string> = {
  base_sepolia: "bg-[hsl(var(--chain-eth))]",
  base: "bg-[hsl(var(--chain-eth))]",
  solana_devnet: "bg-[hsl(var(--chain-sol))]",
  solana: "bg-[hsl(var(--chain-sol))]",
  story_aeneid: "bg-[hsl(var(--chain-story))]",
  story: "bg-[hsl(var(--chain-story))]",
};

const CHAIN_ICONS: Record<string, string> = {
  base_sepolia: "Ξ",
  base: "Ξ",
  solana_devnet: "◎",
  solana: "◎",
  story_aeneid: "📖",
  story: "📖",
};

const EXPLORER_URLS: Record<string, string> = {
  base_sepolia: "https://sepolia.basescan.org/address/",
  base: "https://basescan.org/address/",
  solana_devnet: "https://explorer.solana.com/address/",
  solana: "https://explorer.solana.com/address/",
  story_aeneid: "https://aeneid.storyscan.xyz/address/",
  story: "https://storyscan.xyz/address/",
};

interface WalletBalanceCardProps {
  wallet: WalletInfo;
  balance?: BalanceInfo;
  balanceLoading?: boolean;
}

export const WalletBalanceCard = ({ wallet, balance, balanceLoading }: WalletBalanceCardProps) => {
  const colorClass = CHAIN_COLORS[wallet.chain] || "bg-muted";
  const icon = CHAIN_ICONS[wallet.chain] || "💰";
  const explorerBase = EXPLORER_URLS[wallet.chain];
  const shortAddress = `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    toast({ title: "Address copied", description: shortAddress });
  };

  return (
    <Card className="bg-gradient-card border-border/50 overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${colorClass} text-white`}>
              {icon}
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">{wallet.label}</p>
              <Badge
                variant={wallet.network === "mainnet" ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {wallet.network}
              </Badge>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="mb-4">
          {balanceLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          ) : balance?.error ? (
            <p className="text-sm text-destructive">{balance.error}</p>
          ) : (
            <p className="font-display text-2xl font-bold text-foreground tabular-nums">
              {balance?.native_balance ?? "—"}
            </p>
          )}
          {balance?.token_balances?.map((t) => (
            <p key={t.symbol} className="text-sm text-muted-foreground mt-1">
              {t.balance} {t.symbol}
            </p>
          ))}
        </div>

        {/* Address row */}
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground font-mono">
            {shortAddress}
          </code>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyAddress}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {explorerBase && (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={`${explorerBase}${wallet.address}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
