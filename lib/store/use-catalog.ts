'use client';

import { useEffect, useState } from 'react';
import type { Product, Category } from '@/types';

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/catalog', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
        return response.json();
      })
      .then(data => {
        setProducts(data.products || []);
        setCategories(data.categories || []);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError('Products could not be loaded. Please try again later.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return { products, categories, loading, error };
}
