
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

  return (
    <main style={{ padding: '32px' }}>
      <Link href="/admin">Back to Dashboard</Link>
      <h1>Remedy Nation — Product Management</h1>
      <p>Product management page is working successfully.</p>
    </main>
  );
}
