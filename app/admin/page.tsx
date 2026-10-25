
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();

  // Verify the authenticated user on the server.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?redirect=/admin');
  }

  // Verify administrator permissions in Supabase.
  const { data: isAdmin, error: roleError } =
    await supabase.rpc('is_store_admin');

  if (roleError || isAdmin !== true) {
    redirect('/');
  }

  return (
    <main style={{ padding: '32px', minHeight: '80vh' }}>
      <h1>Remedy Nation Admin Dashboard</h1>
      <p>Welcome to your store management dashboard.</p>

      <section style={{ marginTop: '32px' }}>
        <h2>Store Management</h2>
        <p>Products, inventory, and orders will appear here.</p>
      </section>
    </main>
  );
}
