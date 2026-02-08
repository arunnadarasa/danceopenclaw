import { useEffect, useState, useCallback } from "react";
import { ExternalLink, RefreshCw, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EXPLORER_URLS: Record<string, { base: string; suffix?: string }> = {
  base_sepolia: { base: "https://sepolia.basescan.org/tx/" },
  base: { base: "https://basescan.org/tx/" },
  solana_devnet: { base: "https://explorer.solana.com/tx/", suffix: "?cluster=devnet" },
  solana: { base: "https://explorer.solana.com/tx/" },
  story_aeneid: { base: "https://aeneid.storyscan.xyz/tx/" },
  story: { base: "https://storyscan.xyz/tx/" },
};

const CHAIN_LABELS: Record<string, string> = {
  base_sepolia: "Base Sepolia",
  base: "Base",
  solana_devnet: "Solana Devnet",
  solana: "Solana",
  story_aeneid: "Story Aeneid",
  story: "Story",
};

interface Transaction {
  id: string;
  chain: string;
  token_type: string;
  from_address: string;
  to_address: string;
  amount: string;
  tx_hash: string | null;
  status: string;
  created_at: string;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function getExplorerUrl(chain: string, hash: string): string {
  const explorer = EXPLORER_URLS[chain];
  if (!explorer) return "#";
  return `${explorer.base}${hash}${explorer.suffix || ""}`;
}

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
      title={address}
    >
      {truncateAddress(address)}
      {copied ? (
        <Check className="h-3 w-3 text-primary" />
      ) : (
        <Copy className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}

interface TransactionHistoryProps {
  agentId: string | null;
  refreshKey?: number;
}

export function TransactionHistory({ agentId, refreshKey }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!agentId) return;

    const { data, error } = await supabase
      .from("wallet_transactions" as any)
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setTransactions(data as unknown as Transaction[]);
    }
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  if (!agentId) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Transaction History</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No transactions yet. Send tokens to see history here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Tx Hash</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {CHAIN_LABELS[tx.chain] || tx.chain}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs uppercase">
                        {tx.token_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {tx.amount}
                    </TableCell>
                    <TableCell>
                      <CopyableAddress address={tx.to_address} />
                    </TableCell>
                    <TableCell>
                      {tx.tx_hash ? (
                        <a
                          href={getExplorerUrl(tx.chain, tx.tx_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                        >
                          {truncateAddress(tx.tx_hash)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.status === "success" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {tx.status}
                      </Badge>
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
}
