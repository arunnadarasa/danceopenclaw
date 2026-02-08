import { useState } from "react";
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
import { CreditCard, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { NETWORK_OPTIONS, NETWORK_LABELS, DEFAULT_URLS } from "./payment-constants";

interface EchoTestPaymentCardProps {
  agentId: string | null;
  onPaymentComplete: () => void;
}

const EchoTestPaymentCard = ({ agentId, onPaymentComplete }: EchoTestPaymentCardProps) => {
  const { executePayment, loading, error, lastResult } = useX402Payment();
  const [targetUrl, setTargetUrl] = useState(DEFAULT_URLS["testnet"]);
  const [network, setNetwork] = useState<X402PaymentParams["network"]>("testnet");
  const [maxAmount, setMaxAmount] = useState("1.00");

  const handleExecute = async () => {
    if (!agentId) return;
    await executePayment({ agentId, targetUrl, network, maxAmount });
    onPaymentComplete();
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Test x402 Payment
        </CardTitle>
        <CardDescription>
          Send a request to an echo-test 402-gated URL. Your agent will automatically sign and pay. The payment is echoed back for verification.
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
            <Select
              value={network}
              onValueChange={(v) => {
                const newNetwork = v as X402PaymentParams["network"];
                setNetwork(newNetwork);
                const isDefault = Object.values(DEFAULT_URLS).includes(targetUrl);
                if (isDefault) {
                  setTargetUrl(DEFAULT_URLS[v] || targetUrl);
                }
              }}
            >
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
  );
};

export default EchoTestPaymentCard;
