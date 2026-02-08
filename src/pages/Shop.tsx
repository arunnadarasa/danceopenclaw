import { useState } from "react";
import { ShoppingBag, Tag, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import ProductCard from "@/components/shop/ProductCard";
import { CartDrawer } from "@/components/shop/CartDrawer";

/* ── Mock fallback data ── */
type Category = "All" | "Apparel" | "Accessories" | "Music" | "Gear";

interface MockProduct {
  id: string;
  title: string;
  price: number;
  category: Exclude<Category, "All">;
  image: string;
  badge?: string;
}

const MOCK_PRODUCTS: MockProduct[] = [
  { id: "1", title: "Breaking Crew Tee", price: 12, category: "Apparel", image: "https://placehold.co/400x400/1a1a2e/7c3aed?text=🔥+Crew+Tee", badge: "Popular" },
  { id: "2", title: "Popping Gloves", price: 8, category: "Accessories", image: "https://placehold.co/400x400/1a1a2e/06b6d4?text=🧤+Gloves" },
  { id: "3", title: "Dance Battle Hoodie", price: 25, category: "Apparel", image: "https://placehold.co/400x400/1a1a2e/a855f7?text=🏆+Hoodie", badge: "New" },
  { id: "4", title: "Cypher Beats Vol. 1", price: 5, category: "Music", image: "https://placehold.co/400x400/1a1a2e/ec4899?text=🎵+Beats" },
  { id: "5", title: "Grip Headband", price: 4, category: "Accessories", image: "https://placehold.co/400x400/1a1a2e/f59e0b?text=💪+Headband" },
  { id: "6", title: "Waacking Fan (Gold)", price: 15, category: "Gear", image: "https://placehold.co/400x400/1a1a2e/eab308?text=✨+Fan" },
];

const CATEGORIES: Category[] = ["All", "Apparel", "Accessories", "Music", "Gear"];

const Shop = () => {
  const { products: shopifyProducts, loading: shopifyLoading } = useShopifyProducts();
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const hasShopifyProducts = shopifyProducts.length > 0;

  const filteredMock =
    activeCategory === "All"
      ? MOCK_PRODUCTS
      : MOCK_PRODUCTS.filter((p) => p.category === activeCategory);

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10">
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Shop</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Dance merch marketplace — powered by your agent
            </p>
          </div>
        </div>
        <CartDrawer />
      </div>

      {/* Loading state */}
      {shopifyLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Real Shopify products */}
      {!shopifyLoading && hasShopifyProducts && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shopifyProducts.map((product) => (
            <ProductCard key={product.node.id} product={product} />
          ))}
        </div>
      )}

      {/* Mock fallback when no Shopify products */}
      {!shopifyLoading && !hasShopifyProducts && (
        <>
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/20 text-muted-foreground hover:border-primary/30"
                }`}
              >
                {cat === "All" && <Tag className="h-3.5 w-3.5" />}
                {cat}
              </button>
            ))}
          </div>

          {/* Mock Product Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMock.map((product) => (
              <Card key={product.id} className="overflow-hidden bg-gradient-card">
                <div className="relative aspect-square bg-secondary/30">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {product.badge && (
                    <Badge className="absolute top-3 right-3">{product.badge}</Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-semibold text-foreground leading-tight">
                      {product.title}
                    </h3>
                    <Badge variant="outline" className="shrink-0 font-mono">
                      {product.price} USDC
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {product.category}
                    </Badge>
                    <Button size="sm" disabled className="opacity-60">
                      <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                      Coming Soon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Shop;
