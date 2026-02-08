import { useState, useEffect } from "react";
import {
  storefrontApiRequest,
  STOREFRONT_PRODUCTS_QUERY,
  type ShopifyProduct,
} from "@/lib/shopify";

export function useShopifyProducts(first = 50) {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first });
        if (cancelled) return;
        const edges: ShopifyProduct[] = data?.data?.products?.edges ?? [];
        setProducts(edges);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [first]);

  return { products, loading, error };
}
