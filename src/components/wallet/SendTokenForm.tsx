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
  onSendSol?: (chain: string, transaction: string, meta?: { token_type?: string; to_address?: string; amount?: string }) => Promise<unknown>;
  loading: boolean;
}

type TokenType = "native" | "usdc";

// Chains that support USDC sends (EVM + Solana)
const USDC_CHAINS = ["base_sepolia", "base", "solana_devnet", "solana", "story"];

const SOLANA_RPC: Record<string, string> = {
  solana_devnet: "https://api.devnet.solana.com",
  solana: "https://api.mainnet-beta.solana.com",
};

const SOLANA_USDC_MINTS: Record<string, string> = {
  solana_devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
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

  return btoa(String.fromCharCode(...serialized));
}

async function buildSolanaUsdcTransaction(
  fromAddress: string,
  toAddress: string,
  amount: string,
  rpcUrl: string,
  usdcMint: string
): Promise<string> {
  const { Connection, PublicKey, Transaction } = await import("@solana/web3.js");
  const { getAssociatedTokenAddressSync, createTransferCheckedInstruction, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import("@solana/spl-token");

  const connection = new Connection(rpcUrl, "processed");
  const fromPubkey = new PublicKey(fromAddress);
  const toPubkey = new PublicKey(toAddress);
  const mintPubkey = new PublicKey(usdcMint);

  // USDC has 6 decimals
  const decimals = 6;
  const rawAmount = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));

  // Get associated token accounts
  const fromAta = getAssociatedTokenAddressSync(mintPubkey, fromPubkey);
  const toAta = getAssociatedTokenAddressSync(mintPubkey, toPubkey);

  const { blockhash } = await connection.getLatestBlockhash("processed");

  const transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  // Check if recipient's ATA exists, if not create it
  const toAtaInfo = await connection.getAccountInfo(toAta);
  if (!toAtaInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromPubkey,       // payer
        toAta,            // associated token account
        toPubkey,         // owner
        mintPubkey,       // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Add transferChecked instruction (validates decimals)
  transaction.add(
    createTransferCheckedInstruction(
      fromAta,          // source
      mintPubkey,       // mint
      toAta,            // destination
      fromPubkey,       // owner
      rawAmount,        // amount
      decimals          // decimals
    )
  );

  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

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
      if (tokenType === "usdc" && isSolana) {
        // Send raw params to backend — backend builds tx server-side (avoids CORS/403)
        if (!onSendSol) throw new Error("Solana send not available");
        await onSendSol(chain, "", { token_type: "usdc", to_address: to, amount });
      } else if (tokenType === "usdc") {
        // EVM USDC (Base)
        await onSendUsdc(chain, to, amount);
      } else if (isSolana) {
        // Native SOL transfer — send raw params to backend
        if (!onSendSol) throw new Error("Solana send not available");
        await onSendSol(chain, "", { token_type: "native", to_address: to, amount });
      } else {
        // EVM native (ETH/IP)
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
