
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import NewProductForm from './NewProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?redirect=/admin/products/new');
  }

  const { data: isAdmin, error: adminError } =
    await supabase.rpc('is_store_admin');

  if (adminError || isAdmin !== true) {
    redirect('/');
  }

  async function addProduct(formData: FormData) {
    'use server';

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Authentication required');
    }

    const { data: isAdmin, error: adminError } =
      await supabase.rpc('is_store_admin');

    if (adminError || isAdmin !== true) {
      throw new Error('Administrator access required');
    }

    const name = String(formData.get('name') || '').trim();
    const slug = String(formData.get('slug') || '').trim();
    const description = String(
      formData.get('description') || ''
    ).trim();
    const sku = String(formData.get('sku') || '').trim();
    const priceText = String(formData.get('price') || '');
    const stockText = String(formData.get('stock_quantity') || '');
    const price = Number(priceText);
    const stock = Number(stockText);

    if (
      !name ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
      !priceText ||
      !Number.isFinite(price) ||
      price < 0 ||
      !stockText ||
      !Number.isSafeInteger(stock) ||
      stock < 0
    ) {
      throw new Error('Please enter valid product details');
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name,
        slug,
        description: description || null,
        sku: sku || null,
        price,
        stock_quantity: stock,
        type: 'physical',
        is_active: formData.get('is_active') === 'on',
        is_featured: formData.get('is_featured') === 'on',
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(
        'Unable to save product: ' + error.message
      );
    }

    if (!product?.id) {
      throw new Error(
        'Product was created but its ID was not returned.'
      );
    }

    return { productId: product.id };
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 32 }}>
      <Link href="/admin/products">
        ← Back to Products
      </Link>

      <h1>Add New Product</h1>
      <p>
        Enter the details of your Remedy Nation product.
      </p>

      <NewProductForm createProduct={addProduct} />
    </main>
  );
}  