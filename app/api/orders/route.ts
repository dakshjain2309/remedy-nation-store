import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const size = Number(request.headers.get('content-length') || 0);
    if (size > 12000) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    let env: Record<string, unknown> = {};
    try {
      const ctx = await getCloudflareContext({ async: true });
      env = ctx.env as unknown as Record<string, unknown>;
    } catch { /* Local Next.js development */ }
    const url = String(env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const secret = String(env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!url.startsWith('https://') || !secret || secret.includes('placeholder')) {
      return NextResponse.json({ error: 'Checkout is not configured' }, { status: 503 });
    }
    
    // Limit repeated checkout requests per visitor.
const limiter = env.COD_RATE_LIMITER as
  | { limit: (options: { key: string }) => Promise<{ success: boolean }> }
  | undefined;

if (!limiter) {
  return NextResponse.json(
    { error: 'Checkout protection is not configured' },
    { status: 503 }
  );
}

const visitorIP = request.headers.get('cf-connecting-ip');

if (!visitorIP) {
  return NextResponse.json(
    { error: 'Unable to verify checkout request' },
    { status: 403 }
  );
}

const { success } = await limiter.limit({
  key: `cod:${visitorIP}`,
});

if (!success) {
  return NextResponse.json(
    { error: 'Too many checkout attempts. Please try again shortly.' },
    { status: 429 }
  );
}
    const body = await request.json();
    const customer = body?.customer;
    const items = body?.items;
    if (!customer || !Array.isArray(items) || items.length < 1 || items.length > 30 ||
      customer.payment !== 'cod' ||
      !['email', 'name', 'address', 'city', 'state', 'zip', 'phone'].every(key =>
        typeof customer[key] === 'string' && customer[key].trim().length > 0 && customer[key].length <= 250) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) ||
      !items.every((item: Record<string, unknown>) =>
        typeof item.product_id === 'string' && /^[0-9a-f-]{36}$/i.test(item.product_id) &&
        (item.variant_id == null || (typeof item.variant_id === 'string' && /^[0-9a-f-]{36}$/i.test(item.variant_id))) &&
        Number.isInteger(item.quantity) && Number(item.quantity) >= 1 && Number(item.quantity) <= 20)) {
      return NextResponse.json({ error: 'Please check your order details' }, { status: 400 });
    }
    // Service credential stays server-side. The database RPC validates stock/prices
    // and writes address, order and items in one transaction.
    const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.rpc('place_cod_order', {
      p_customer: customer,
      p_items: items,
    });
    if (error) {
      console.error('COD order RPC failed:', error.code, error.message);
      return NextResponse.json({ error: 'Unable to place order. Check stock and try again.' }, { status: 400 });
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Checkout request failed:', error);
    return NextResponse.json({ error: 'Checkout is temporarily unavailable' }, { status: 500 });
  }
}
