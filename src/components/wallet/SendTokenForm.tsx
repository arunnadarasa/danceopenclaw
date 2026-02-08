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
  onSendSol?: (chain: string, transaction: string) => Promise<unknown>;
  loading: boolean;
}

type TokenType = "native" | "usdc";

const USDC_CHAINS = ["base_sepolia", "base"];

const SOLANA_RPC: Record<string, string> = {
  solana_devnet: "https://api.devnet.solana.com",
  solana: "https://api.mainnet-beta.solana.com",
};

function getNativeTokenLabel(chain: string): string {
  if (chain.startsWith("solana")) return "SOL";
  if (chain.startsWith("story")) return "IP";
  return "ETH";
}

async function buildSolanaTransaction(
  fromAddress: string,
  toAddress: string,
  amountSol: string,
  rpcUrl: string
): Promise<string> {
  const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = await import("@solana/web3.js");

  const connection = new Connection(rpcUrl, "processed");
  const fromPubkey = new PublicKey(fromAddress);
  const toPubkey = new PublicKey(toAddress);
  const lamports = Math.floor(parseFloat(amountSol) * LAMPORTS_PER_SOL);

  const { blockhash } = await connection.getLatestBlockhash("processed");

  const transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;
  transaction.add(
    SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
  );

  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  // Convert to base64
  return btoa(String.fromCharCode(...serialized));
}

export const SendTokenForm = ({ wallets, onSendNative, onSendUsdc, onSendSol, loading }: SendTokenFormProps) => {
  const [chain, setChain] = useState<string>("");
  const [tokenType, setTokenType] = useState<TokenType>("native");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  const selectedWallet = wallets.find((w) => w.chain === chain);
  const canSendUsdc = chain && USDC_CHAINS.includes(chain);
  const isSolana = chain.startsWith("solana");
  const nativeLabel = chain ? getNativeTokenLabel(chain) : "native";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chain || !to || !amount) return;

    setSending(true);
    try {
      if (tokenType === "usdc") {
        await onSendUsdc(chain, to, amount);
      } else if (isSolana) {
        // Build the Solana transaction client-side, then send via the send_sol action
        if (!selectedWallet) throw new Error("No Solana wallet found");
        if (!onSendSol) throw new Error("Solana send not available");

        const rpcUrl = SOLANA_RPC[chain];
        if (!rpcUrl) throw new Error(`No RPC URL for ${chain}`);

        const serializedTx = await buildSolanaTransaction(
          selectedWallet.address,
          to,
          amount,
          rpcUrl
        );

        await onSendSol(chain, serializedTx);
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
    } finally {
      setSending(false);
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
          {/* Chain select */}
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

          <Button type="submit" disabled={loading || sending || !chain || !to || !amount} className="w-full">
            {loading || sending ? "Sending…" : "Send Transaction"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
