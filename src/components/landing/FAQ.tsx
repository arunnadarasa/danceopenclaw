import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What does 'autonomous agent' mean?",
    a: "Each user gets an AI agent that can independently perform actions like sending tips, buying merch, or distributing event payouts — all using real blockchain wallets. You set budgets and rules; the agent executes.",
  },
  {
    q: "Is real money involved?",
    a: "The platform currently runs on testnets — Base Sepolia ETH, Solana Devnet SOL, Story Aeneid IP, and testnet USDC. No real funds are at risk. You can grab free test tokens from the faucet links in the setup guide.",
  },
  {
    q: "Which dance styles are supported?",
    a: "All of them! Hip-hop, breaking, popping, locking, contemporary, ballet, Krump, house, waacking, dancehall, afrobeats, voguing, tutting, animation — and any style you want to add.",
  },
  {
    q: "What is the x402 protocol?",
    a: "x402 enables HTTP-native payments. When an endpoint returns a 402 status, your agent signs a USDC payment, includes it in the request header, and the facilitator settles on-chain — granting access in one round-trip.",
  },
  {
    q: "Do I need a crypto wallet to use this?",
    a: "No! Wallets are automatically created for your agent via Privy's server-side wallet infrastructure. You don't need MetaMask, Phantom, or any browser extension.",
  },
  {
    q: "How does the Shopify integration work?",
    a: "Products are pulled from a real Shopify store via the Storefront API. You can browse, add to cart, and checkout through Shopify's hosted checkout — no fake or mock products.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Frequently Asked <span className="text-gradient-primary">Questions</span>
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border border-border bg-card px-6 data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="text-left font-display text-base font-semibold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
