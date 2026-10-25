
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?redirect=/admin/products');
  }

  const { data: isAdmin, error: adminError } =
    await supabase.rpc('is_store_admin');

  if (adminError || isAdmin !== true) {
    redirect('/');
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(
      'id, name, sku, price, stock_quantity, is_active, is_featured'
    )
    .order('created_at', { ascending: false });

  return (
    <main style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
      <Link href="/admin">← Back to Dashboard</Link>

      <h1>Product Management</h1>
      <p>Manage your Remedy Nation product catalogue.</p>

      {productsError ? (
        <p role="alert">
          Unable to load products: {productsError.message}
        </p>
      ) : !products?.length ? (
        <p>No products found. We'll add the product creation form next.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: 24,
              textAlign: 'left',
            }}
          >
            <thead>
              <tr>
                {[
                  'Product',
                  'SKU',
                  'Price',
                  'Stock',
                  'Status',
                  'Featured',
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: 12,
                      borderBottom: '2px solid #ddd',
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td style={{ padding: 12 }}>{product.name}</td>
                  <td style={{ padding: 12 }}>{product.sku || '—'}</td>
                  <td style={{ padding: 12 }}>
                    ₹{Number(product.price).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: 12 }}>
                    {product.stock_quantity}
                  </td>
                  <td style={{ padding: 12 }}>
                    {product.is_active ? 'Active' : 'Hidden'}
                  </td>
                  <td style={{ padding: 12 }}>
                    {product.is_featured ? 'Yes' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
