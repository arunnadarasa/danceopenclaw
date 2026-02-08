import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useX402Payment, type X402PaymentParams } from "@/hooks/useX402Payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const NETWORK_OPTIONS = [
  { value: "testnet", label: "Base Sepolia (Testnet)" },
  { value: "mainnet", label: "Base Mainnet" },
  { value: "story-mainnet", label: "Story Mainnet" },
  { value: "solana-testnet", label: "Solana Devnet" },
  { value: "solana-mainnet", label: "Solana Mainnet" },
] as const;

const NETWORK_LABELS: Record<string, string> = {
  testnet: "Base Sepolia",
  mainnet: "Base Mainnet",
  "story-mainnet": "Story Mainnet",
  "solana-testnet": "Solana Devnet",
  "solana-mainnet": "Solana Mainnet",
  "base-sepolia": "Base Sepolia",
  base: "Base Mainnet",
  story: "Story Mainnet",
  "solana-devnet": "Solana Devnet",
  solana: "Solana Mainnet",
};

const EXPLORER_URLS: Record<string, string> = {
  testnet: "https://sepolia.basescan.org/tx/",
  mainnet: "https://basescan.org/tx/",
  "story-mainnet": "https://storyscan.xyz/tx/",
  "base-sepolia": "https://sepolia.basescan.org/tx/",
  base: "https://basescan.org/tx/",
  story: "https://storyscan.xyz/tx/",
  solana: "https://explorer.solana.com/tx/",
  "solana-devnet": "https://explorer.solana.com/tx/",
};

function getExplorerUrl(network: string, txHash: string): string {
  const base = EXPLORER_URLS[network] || "https://sepolia.basescan.org/tx/";
  const suffix = network === "solana-devnet" ? "?cluster=devnet" : "";
  return `${base}${txHash}${suffix}`;
}

interface PaymentRecord {
  id: string;
  agent_id: string;
  wallet_address: string;
  recipient_address: string;
  amount: string;
  network: string;
  target_url: string;
  tx_hash: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

const Payments = () => {
  const { user } = useAuth();
  const { executePayment, loading, error, lastResult } = useX402Payment();

  const DEFAULT_URLS: Record<string, string> = {
    testnet: "https://x402.payai.network/api/base-sepolia/paid-content",
    mainnet: "https://x402.payai.network/api/base/paid-content",
    "story-mainnet": "https://storyx402.lovable.app/",
    "solana-testnet": "https://x402.payai.network/api/solana-devnet/paid-content",
    "solana-mainnet": "https://x402.payai.network/api/solana/paid-content",
  };

  const [targetUrl, setTargetUrl] = useState(DEFAULT_URLS["testnet"]);
  const [network, setNetwork] = useState<X402PaymentParams["network"]>("testnet");
  const [maxAmount, setMaxAmount] = useState("1.00");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch agent ID
  useEffect(() => {
    if (!user) return;
    supabase
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAgentId(data.id);
      });
  }, [user]);

  // Fetch payment history
  const fetchPayments = async () => {
    if (!agentId) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from("agent_payments")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setPayments(data as unknown as PaymentRecord[]);
    setLoadingHistory(false);
  };

  useEffect(() => {
    fetchPayments();
  }, [agentId]);

  const handleExecute = async () => {
    if (!agentId) return;
    await executePayment({ agentId, targetUrl, network, maxAmount });
    fetchPayments();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-success/20 text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />Success</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">x402 Payments</h1>
        <p className="text-muted-foreground mt-1">
          Execute and track HTTP 402 payments using USDC across chains.
        </p>
      </div>

      {/* Test Payment Card */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Test x402 Payment
          </CardTitle>
          <CardDescription>
            Send a request to a 402-gated URL. Your agent will automatically sign and pay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Target URL</label>
              <Input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com/paid-content"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Network</label>
              <Select value={network} onValueChange={(v) => {
                  const newNetwork = v as X402PaymentParams["network"];
                  setNetwork(newNetwork);
                  const isDefault = Object.values(DEFAULT_URLS).includes(targetUrl);
                  if (isDefault) {
                    setTargetUrl(DEFAULT_URLS[v] || targetUrl);
                  }
                }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NETWORK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Amount (USDC)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleExecute} disabled={loading || !agentId} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Executing…
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Execute Payment
              </>
            )}
          </Button>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 inline mr-1.5" />
              {error}
            </div>
          )}

          {lastResult && !error && (
            <div className="rounded-lg border border-success/50 bg-success/10 p-4 space-y-2">
              <p className="text-sm font-medium text-success">Payment executed successfully</p>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">Amount:</span> {lastResult.paymentAmount} USDC</p>
                <p><span className="font-medium text-foreground">Recipient:</span> <span className="font-mono">{lastResult.recipient}</span></p>
                <p><span className="font-medium text-foreground">Network:</span> {NETWORK_LABELS[lastResult.network || ""] || lastResult.network}</p>
                <p><span className="font-medium text-foreground">HTTP Status:</span> {lastResult.status}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Recent x402 payments made by your agent.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Target URL</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tx Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(p.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs font-mono">
                        {p.target_url}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {p.amount} USDC
                      </TableCell>
                      <TableCell className="text-xs">{NETWORK_LABELS[p.network] || p.network}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell>
                        {p.tx_hash ? (
                          <a
                            href={getExplorerUrl(p.network, p.tx_hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                          >
                            {p.tx_hash.slice(0, 8)}…
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
