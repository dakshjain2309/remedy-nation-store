import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createClient } from '@supabase/supabase-js';
import type { Product, Category, ProductImage, ProductVariant } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Worker runtime bindings: avoids relying on NEXT_PUBLIC_* build-time inlining.
    let bindings: Record<string, unknown> = {};
    try {
      const context = await getCloudflareContext({ async: true });
      bindings = context.env as unknown as Record<string, unknown>;
    } catch {
      // Local `next dev` does not necessarily have a Cloudflare context.
    }
    const url = String(bindings.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const key = String(bindings.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url.startsWith('https://') || !url.includes('.supabase.co') || !key || key.includes('placeholder')) {
      return NextResponse.json({ error: 'Supabase runtime variables are missing or invalid' }, { status: 503 });
    }

    // Only public/publishable credentials. RLS must also protect the database.
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const [productResult, categoryResult, imageResult, variantResult] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true),
      supabase.from('categories').select('*').eq('is_active', true),
      supabase.from('product_images').select('*'),
      supabase.from('product_variants').select('*').eq('is_active', true),
    ]);
    for (const result of [productResult, categoryResult, imageResult, variantResult]) {
      if (result.error) throw result.error;
    }
    const categories = (categoryResult.data || []) as Category[];
    const categoryMap = new Map(categories.map(category => [category.id, category]));
    const images = (imageResult.data || []) as ProductImage[];
    const variants = (variantResult.data || []) as ProductVariant[];
    const products = ((productResult.data || []) as Product[]).map(product => ({
      ...product,
      // Never return private digital download URLs in the public catalog.
      digital_file_url: null,
      category: product.category_id ? categoryMap.get(product.category_id) : undefined,
      images: images.filter(image => image.product_id === product.id).sort((a, b) => a.position - b.position),
      variants: variants.filter(variant => variant.product_id === product.id),
    }));
    return NextResponse.json({ products, categories }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Catalog retrieval failed:', error);
    return NextResponse.json({ error: 'Unable to load the product catalog' }, { status: 500 });
  }
}
