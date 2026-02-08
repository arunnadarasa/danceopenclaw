import { useState } from "react";
import { useX402Payment } from "@/hooks/useX402Payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Loader2, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { type PaymentRecord } from "./PaymentHistoryTable";
import { getExplorerUrl } from "./payment-constants";

interface StoryPaymentCardProps {
  agentId: string | null;
  onPaymentComplete: () => void;
  payments?: PaymentRecord[];
  loadingHistory?: boolean;
}

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

const StoryPaymentCard = ({ agentId, onPaymentComplete, payments = [], loadingHistory = false }: StoryPaymentCardProps) => {
  const { executePayment, loading, error, lastResult } = useX402Payment();
  const [targetUrl, setTargetUrl] = useState("https://storyx402.lovable.app/");
  const [maxAmount, setMaxAmount] = useState("1.00");

  const handleExecute = async () => {
    if (!agentId) return;
    await executePayment({
      agentId,
      targetUrl,
      network: "story-mainnet",
      maxAmount,
    });
    onPaymentComplete();
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Story Mainnet x402 Payment
          </CardTitle>
          <Badge variant="outline" className="text-xs">On-chain</Badge>
        </div>
        <CardDescription>
          Test against the self-hosted Story facilitator. Payments settle on-chain via USDC.e.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Target URL</label>
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://storyx402.lovable.app/"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Network</label>
            <Input value="Story Mainnet" disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Amount (USDC.e)</label>
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
              <Globe className="h-4 w-4" />
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

        {lastResult && !error && lastResult.paymentExecuted && (
          <div className="rounded-lg border border-success/50 bg-success/10 p-4 space-y-2">
            <p className="text-sm font-medium text-success flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Payment settled on-chain
            </p>
            <div className="grid gap-1 text-xs text-muted-foreground">
              {lastResult.paymentAmount && (
                <p><span className="font-medium text-foreground">Amount:</span> {lastResult.paymentAmount} USDC.e</p>
              )}
              <p><span className="font-medium text-foreground">Network:</span> Story Mainnet</p>
              <p><span className="font-medium text-foreground">HTTP Status:</span> {lastResult.status}</p>
              {(() => {
                let txHash: string | null = null;
                if (lastResult.xPaymentResponse) {
                  try {
                    const decoded = JSON.parse(atob(lastResult.xPaymentResponse));
                    txHash = decoded.txHash || decoded.transactionHash || decoded.transaction || null;
                  } catch { /* ignore */ }
                }
                return txHash ? (
                  <p>
                    <span className="font-medium text-foreground">Tx Hash:</span>{" "}
                    <a
                      href={getExplorerUrl("story-mainnet", txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono inline-flex items-center gap-1"
                    >
                      {txHash.slice(0, 12)}…{txHash.slice(-6)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                ) : null;
              })()}
              {lastResult.data && (
                <div className="mt-2">
                  <span className="font-medium text-foreground">Response:</span>
                  <pre className="mt-1 rounded-md bg-muted p-2 text-xs overflow-x-auto whitespace-pre-wrap max-h-40">
                    {typeof lastResult.data === "string"
                      ? lastResult.data
                      : JSON.stringify(lastResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {lastResult && !error && !lastResult.paymentExecuted && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              No payment required — server returned HTTP {lastResult.status}
            </p>
            <p className="text-xs text-muted-foreground">
              The target URL did not return a 402 Payment Required response. No on-chain payment was executed.
            </p>
            {lastResult.data && (
              <details className="mt-2">
                <summary className="text-xs font-medium text-foreground cursor-pointer">View Response</summary>
                <pre className="mt-1 rounded-md bg-muted p-2 text-xs overflow-x-auto whitespace-pre-wrap max-h-40">
                  {typeof lastResult.data === "string"
                    ? lastResult.data
                    : JSON.stringify(lastResult.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Compact Story Payment History */}
        <div className="mt-2 border-t border-border pt-4">
          <h4 className="text-sm font-medium mb-3">Recent Story Payments</h4>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-center py-4 text-xs text-muted-foreground">No Story payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs h-8 px-2">Date</TableHead>
                    <TableHead className="text-xs h-8 px-2">Amount</TableHead>
                    <TableHead className="text-xs h-8 px-2">Status</TableHead>
                    <TableHead className="text-xs h-8 px-2">Tx Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs whitespace-nowrap px-2 py-2">
                        {new Date(p.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap px-2 py-2">
                        {p.amount} USDC.e
                      </TableCell>
                      <TableCell className="px-2 py-2">{statusBadge(p.status)}</TableCell>
                      <TableCell className="px-2 py-2">
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
        </div>
      </CardContent>
    </Card>
  );
};

export default StoryPaymentCard;
