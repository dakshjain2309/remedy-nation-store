
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?redirect=/admin');
  }

  const { data: isAdmin, error: adminError } =
    await supabase.rpc('is_store_admin');

  if (adminError || isAdmin !== true) {
    redirect('/');
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 32 }}>
      <h1>Remedy Nation Admin Dashboard</h1>
      <p>Welcome to your store management dashboard.</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          marginTop: 32,
        }}
      >
        <Link
          href="/admin/products"
          style={{
            padding: 24,
            border: '1px solid #ddd',
            borderRadius: 12,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <h2>Products</h2>
          <p>View products, prices, and availability.</p>
          <strong>Manage Products →</strong>
        </Link>

        <div
          style={{
            padding: 24,
            border: '1px solid #ddd',
            borderRadius: 12,
          }}
        >
          <h2>Orders</h2>
          <p>View and manage customer orders.</p>
          <span>Coming Soon</span>
        </div>

        <div
          style={{
            padding: 24,
            border: '1px solid #ddd',
            borderRadius: 12,
          }}
        >
          <h2>Inventory</h2>
          <p>Monitor stock quantities and availability.</p>
          <span>Coming Soon</span>
        </div>
      </div>
    </main>
  );
}
