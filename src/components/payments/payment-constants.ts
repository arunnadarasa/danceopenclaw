export const NETWORK_OPTIONS = [
  { value: "testnet", label: "Base Sepolia (Testnet)" },
  { value: "mainnet", label: "Base Mainnet" },
  { value: "solana-testnet", label: "Solana Devnet" },
  { value: "solana-mainnet", label: "Solana Mainnet" },
] as const;

export const NETWORK_LABELS: Record<string, string> = {
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

export const EXPLORER_URLS: Record<string, string> = {
  testnet: "https://sepolia.basescan.org/tx/",
  mainnet: "https://basescan.org/tx/",
  "story-mainnet": "https://www.storyscan.io/tx/",
  "base-sepolia": "https://sepolia.basescan.org/tx/",
  base: "https://basescan.org/tx/",
  story: "https://www.storyscan.io/tx/",
  solana: "https://explorer.solana.com/tx/",
  "solana-devnet": "https://explorer.solana.com/tx/",
};

export const DEFAULT_URLS: Record<string, string> = {
  testnet: "https://x402.payai.network/api/base-sepolia/paid-content",
  mainnet: "https://x402.payai.network/api/base/paid-content",
  "solana-testnet": "https://x402.payai.network/api/solana-devnet/paid-content",
  "solana-mainnet": "https://x402.payai.network/api/solana/paid-content",
};

export function getExplorerUrl(network: string, txHash: string): string {
  const base = EXPLORER_URLS[network] || "https://sepolia.basescan.org/tx/";
  const suffix = network === "solana-devnet" ? "?cluster=devnet" : "";
  return `${base}${txHash}${suffix}`;
}
