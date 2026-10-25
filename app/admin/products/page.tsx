
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Product = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
};

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

  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, sku, price, stock_quantity, is_active, is_featured'
    )
    .order('created_at', { ascending: false });

  const products = (data ?? []) as Product[];

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '32px 20px',
      }}
    >
      <Link href="/admin">← Back to Dashboard</Link>

      
<div
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  }}
>
  <div>
    <h1>Product Management</h1>
    <p>Manage your Remedy Nation product catalogue.</p>
  </div>

  <Link
    href="/admin/products/new"
    style={{
      display: 'inline-block',
      backgroundColor: '#222',
      color: '#fff',
      padding: '12px 22px',
      borderRadius: 8,
      textDecoration: 'none',
      fontWeight: 600,
    }}
  >
    + Add Product
  </Link>
</div>


      {error ? (
        <p role="alert">
          Unable to load products: {error.message}
        </p>
      ) : products.length === 0 ? (
        <p>No products found. Add Product will be available soon.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 24 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
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
                  <td style={{ padding: 12 }}>
                    {product.sku || '—'}
                  </td>
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
