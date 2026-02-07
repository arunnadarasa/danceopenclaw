import { useState } from "react";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { WalletInfo } from "@/hooks/useAgentWallet";

interface SendTokenFormProps {
  wallets: WalletInfo[];
  onSendNative: (chain: string, to: string, value: string) => Promise<unknown>;
  onSendUsdc: (chain: string, to: string, amount: string) => Promise<unknown>;
  loading: boolean;
}

type TokenType = "native" | "usdc";

const USDC_CHAINS = ["base_sepolia", "base"];

// Map chain keys to native token labels
function getNativeTokenLabel(chain: string): string {
  if (chain.startsWith("solana")) return "SOL";
  if (chain.startsWith("story")) return "IP";
  return "ETH";
}

export const SendTokenForm = ({ wallets, onSendNative, onSendUsdc, loading }: SendTokenFormProps) => {
  const [chain, setChain] = useState<string>("");
  const [tokenType, setTokenType] = useState<TokenType>("native");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  const selectedWallet = wallets.find((w) => w.chain === chain);
  const canSendUsdc = chain && USDC_CHAINS.includes(chain);
  const isSolana = chain.startsWith("solana");
  const nativeLabel = chain ? getNativeTokenLabel(chain) : "native";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chain || !to || !amount) return;

    try {
      if (tokenType === "usdc") {
        await onSendUsdc(chain, to, amount);
      } else if (isSolana) {
        toast({
          title: "Solana sends not yet supported",
          description: "Solana native transfers require a serialized transaction. Use the API directly for now.",
          variant: "destructive",
        });
        return;
      } else {
        // Convert human-readable amount to wei hex for EVM chains
        const weiValue = "0x" + (BigInt(Math.floor(parseFloat(amount) * 1e18))).toString(16);
        await onSendNative(chain, to, weiValue);
      }
      toast({ title: "Transaction sent!", description: `Sent ${amount} ${tokenType === "usdc" ? "USDC" : nativeLabel} on ${chain}` });
      setTo("");
      setAmount("");
    } catch (err) {
      toast({
        title: "Transaction failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Send className="h-5 w-5 text-primary" />
          Send Tokens
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Chain select — show ALL wallets */}
          <div className="space-y-2">
            <Label>Chain</Label>
            <Select value={chain} onValueChange={(v) => { setChain(v); setTokenType("native"); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select chain" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((w) => (
                  <SelectItem key={w.chain} value={w.chain}>
                    {w.label} ({w.network})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Token type */}
          {chain && (
            <div className="space-y-2">
              <Label>Token</Label>
              <Select value={tokenType} onValueChange={(v) => setTokenType(v as TokenType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="native">
                    Native ({nativeLabel})
                  </SelectItem>
                  {canSendUsdc && <SelectItem value="usdc">USDC</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recipient */}
          <div className="space-y-2">
            <Label>Recipient Address</Label>
            <Input
              placeholder={isSolana ? "So1..." : "0x..."}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount {tokenType === "usdc" ? "(USDC)" : `(${nativeLabel})`}</Label>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading || !chain || !to || !amount} className="w-full">
            {loading ? "Sending…" : "Send Transaction"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
