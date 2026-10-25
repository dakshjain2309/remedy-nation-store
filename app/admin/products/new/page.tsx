
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

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

    const { error } = await supabase.from('products').insert({
      name,
      slug,
      description: description || null,
      sku: sku || null,
      price,
      stock_quantity: stock,
      type: 'physical',
      is_active: formData.get('is_active') === 'on',
      is_featured: formData.get('is_featured') === 'on',
    });

    if (error) {
      throw new Error('Unable to save product: ' + error.message);
    }

    redirect('/admin/products');
  }

  const inputStyle = {
    width: '100%',
    padding: 12,
    border: '1px solid #ccc',
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 18,
    boxSizing: 'border-box' as const,
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 32 }}>
      <Link href="/admin/products">← Back to Products</Link>

      <h1>Add New Product</h1>
      <p>Enter the details of your Remedy Nation product.</p>

      <form action={addProduct}>
        <label htmlFor="name">Product Name *</label>
        <input
          id="name"
          name="name"
          required
          maxLength={200}
          style={inputStyle}
        />

        <label htmlFor="slug">Product URL Slug *</label>
        <input
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="brass-vastu-deer"
          style={inputStyle}
        />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={5}
          style={inputStyle}
        />

        <label htmlFor="sku">SKU / Product Code</label>
        <input id="sku" name="sku" style={inputStyle} />

        <label htmlFor="price">Selling Price (₹) *</label>
        <input
          id="price"
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          style={inputStyle}
        />

        <label htmlFor="stock_quantity">Stock Quantity *</label>
        <input
          id="stock_quantity"
          name="stock_quantity"
          type="number"
          min="0"
          step="1"
          required
          style={inputStyle}
        />

        <label style={{ display: 'block', marginBottom: 14 }}>
          <input
            type="checkbox"
            name="is_active"
            defaultChecked
          />{' '}
          Active — Show product on website
        </label>

        <label style={{ display: 'block', marginBottom: 24 }}>
          <input type="checkbox" name="is_featured" />{' '}
          Featured Product
        </label>

        <button
          type="submit"
          style={{
            padding: '14px 24px',
            background: '#222',
            color: '#fff',
            border: 0,
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Save Product
        </button>
      </form>
    </main>
  );
}
