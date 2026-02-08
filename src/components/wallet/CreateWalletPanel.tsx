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

const CHAIN_FAMILIES = [
  {
    family: "Base",
    icon: "Ξ",
    colorClass: "bg-[hsl(var(--chain-eth))]",
    chains: [
      { key: "base_sepolia", network: "testnet" as const },
      { key: "base", network: "mainnet" as const },
    ],
  },
  {
    family: "Solana",
    icon: "◎",
    colorClass: "bg-[hsl(var(--chain-sol))]",
    chains: [
      { key: "solana_devnet", network: "testnet" as const },
      { key: "solana", network: "mainnet" as const },
    ],
  },
  {
    family: "Story",
    icon: "📖",
    colorClass: "bg-[hsl(var(--chain-story))]",
    chains: [
      { key: "story_aeneid", network: "testnet" as const },
      { key: "story", network: "mainnet" as const },
    ],
  },
];

export const CreateWalletPanel = ({ onCreateAll, onCreate, loading, existingChains }: CreateWalletPanelProps) => {
  const [creating, setCreating] = useState<string | null>(null);

  // Check which families are fully created (both testnet + mainnet exist)
  const missingFamilies = CHAIN_FAMILIES.filter((f) =>
    f.chains.some((c) => !existingChains.includes(c.key))
  );

  const allMissing = CHAIN_FAMILIES.every((f) =>
    f.chains.every((c) => !existingChains.includes(c.key))
  );

  const handleCreateFamily = async (family: typeof CHAIN_FAMILIES[number]) => {
    setCreating(family.family);
    try {
      // Create each missing chain in the family
      for (const c of family.chains) {
        if (!existingChains.includes(c.key)) {
          await onCreate(c.key);
        }
      }
      toast({ title: "Wallet created", description: `Created ${family.family} wallet` });
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setCreating(null);
    }
  };

  const handleCreateAll = async () => {
    setCreating("all");
    try {
      await onCreateAll("testnet");
      await onCreateAll("mainnet");
      toast({ title: "All wallets created", description: "Created wallets for all chains" });
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setCreating(null);
    }
  };

  if (missingFamilies.length === 0) return null;

  return (
    <Card className="bg-gradient-card border-border/50 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-display text-lg">
            <Plus className="h-5 w-5 text-accent" />
            Create Wallets
          </span>
          {allMissing && (
            <Button
              variant="default"
              size="sm"
              disabled={loading}
              onClick={handleCreateAll}
            >
              {creating === "all" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Create All Wallets
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {missingFamilies.map((f) => (
            <Button
              key={f.family}
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => handleCreateFamily(f)}
              className="gap-2"
            >
              {creating === f.family ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] text-white ${f.colorClass}`}>
                  {f.icon}
                </span>
              )}
              {f.family}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
