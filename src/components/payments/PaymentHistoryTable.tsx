import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { NETWORK_LABELS, getExplorerUrl } from "./payment-constants";

export interface PaymentRecord {
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

interface PaymentHistoryTableProps {
  payments: PaymentRecord[];
  loading: boolean;
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

const PaymentHistoryTable = ({ payments, loading }: PaymentHistoryTableProps) => {
  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        <CardDescription>Recent x402 payments made by your agent.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
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
  );
};

export default PaymentHistoryTable;
