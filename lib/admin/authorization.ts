import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function requireStoreAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Administrator authentication is required.');
  }

  const { data: isAdmin, error: adminError } =
    await supabase.rpc('is_store_admin');

  if (adminError || isAdmin !== true) {
    throw new Error('Administrator access is required.');
  }

  return supabase;
}
