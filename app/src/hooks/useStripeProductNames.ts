import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Custom hook to fetch product names from Stripe products collection
 * @param productIds - Array of Stripe product IDs to fetch names for
 * @returns Object containing productNames map and loading state
 */
export function useStripeProductNames(productIds: string[]) {
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductNames = async () => {
      if (productIds.length === 0) {
        setLoading(false);
        return;
      }

      const names: Record<string, string> = {};
      
      await Promise.all(
        productIds.map(async (productId) => {
          try {
            const productDoc = await getDoc(
              doc(db, 'stripe_products', productId)
            );
            if (productDoc.exists()) {
              names[productId] = productDoc.data().name;
            }
          } catch (error) {
            console.error(`Error fetching product ${productId}:`, error);
          }
        })
      );
      
      setProductNames(names);
      setLoading(false);
    };

    fetchProductNames();
  }, [productIds.join(',')]);

  return { productNames, loading };
}
