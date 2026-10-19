# Remedy Nation: Supabase catalog integration

The storefront home, products list, and product detail pages now fetch **active** products from `/api/catalog` instead of browser-local demo data. The API reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Cloudflare Worker runtime bindings** (or process.env locally). The key must be a publishable/anon key, NEVER a service-role or secret key.

## Cloudflare
1. In Workers & Pages → remedy-nation-store → Settings → Variables and Secrets → **Production**, verify both variable names exist with the correct values.
2. Deploy this version to Cloudflare. Check `https://YOUR-WORKER.workers.dev/api/catalog`: expect JSON with `products` and `categories`, or an error status explaining configuration.
3. A product with `is_active = false` will **not** appear. Only activate a real product after checking details and inventory.
4. If catalog returns HTTP 500, inspect Worker runtime logs and Supabase RLS/table permissions. The provided SQL migration's product SELECT policy allows everyone to read all product rows, including inactive ones; consider tightening RLS before production.

## Known limitations — do not enable real checkout yet
- The admin/dashboard product editor still uses the **demo-only browser localStorage store**, not Supabase. Add/edit real products in Supabase Table Editor until dashboard is rebuilt and secured.
- Authentication, checkout, Stripe/PayPal, shipping, currency, and payment authorization were **not** migrated or verified. Test them independently before accepting orders. Current formatter defaults to USD, not INR.
- This update only changes public storefront catalog reads; Supabase auth browser client may still need NEXT_PUBLIC_* variables during Next.js build.
- No credentials are included in this ZIP.
