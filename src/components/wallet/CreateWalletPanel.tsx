import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface CreateWalletPanelProps {
  onCreateAll: (network: "testnet" | "mainnet") => Promise<unknown>;
  onCreate: (chain: string) => Promise<unknown>;
  loading: boolean;
  existingChains: string[];
}

const AVAILABLE_CHAINS = [
  { key: "base_sepolia", label: "Base Sepolia", network: "testnet" as const },
  { key: "solana_devnet", label: "Solana Devnet", network: "testnet" as const },
  { key: "story_aeneid", label: "Story Aeneid", network: "testnet" as const },
  { key: "base", label: "Base", network: "mainnet" as const },
  { key: "solana", label: "Solana", network: "mainnet" as const },
  { key: "story", label: "Story", network: "mainnet" as const },
];

export const CreateWalletPanel = ({ onCreateAll, onCreate, loading, existingChains }: CreateWalletPanelProps) => {
  const [creating, setCreating] = useState<string | null>(null);

  const missingTestnets = AVAILABLE_CHAINS.filter(
    (c) => c.network === "testnet" && !existingChains.includes(c.key)
  );
  const missingMainnets = AVAILABLE_CHAINS.filter(
    (c) => c.network === "mainnet" && !existingChains.includes(c.key)
  );

  const handleCreate = async (chain: string) => {
    setCreating(chain);
    try {
      await onCreate(chain);
      toast({ title: "Wallet created", description: `Created wallet on ${chain}` });
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setCreating(null);
    }
  };

  const handleCreateAll = async (network: "testnet" | "mainnet") => {
    setCreating(network);
    try {
      await onCreateAll(network);
      toast({ title: "Wallets created", description: `Created all ${network} wallets` });
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setCreating(null);
    }
  };

  if (missingTestnets.length === 0 && missingMainnets.length === 0) return null;

  return (
    <Card className="bg-gradient-card border-border/50 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Plus className="h-5 w-5 text-accent" />
          Create Wallets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingTestnets.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Testnets</p>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => handleCreateAll("testnet")}
              >
                {creating === "testnet" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Create All Testnets
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {missingTestnets.map((c) => (
                <Button
                  key={c.key}
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={() => handleCreate(c.key)}
                >
                  {creating === c.key ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {missingMainnets.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Mainnets</p>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => handleCreateAll("mainnet")}
              >
                {creating === "mainnet" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Create All Mainnets
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {missingMainnets.map((c) => (
                <Button
                  key={c.key}
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={() => handleCreate(c.key)}
                >
                  {creating === c.key ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
