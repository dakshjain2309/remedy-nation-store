import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Category, Product, ProductImage } from '@/types';
import ProductDeleteButton from '../../ProductDeleteButton';
import ProductEditorForm from '../../ProductEditorForm';
import ProductImageManager from '../../ProductImageManager';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?redirect=/admin/products/${encodeURIComponent(id)}/edit`);
  }

  const { data: isAdmin, error: adminError } =
    await supabase.rpc('is_store_admin');
  if (adminError || isAdmin !== true) redirect('/');

  const [productResult, categoriesResult, imagesResult] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, slug, description, price, compare_at_price, type, category_id, sku, stock_quantity, is_active, is_featured, digital_file_url, created_at, updated_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('categories')
      .select('id, name, slug, description, parent_id, image_url, is_active, created_at')
      .order('name', { ascending: true }),
    supabase
      .from('product_images')
      .select('id, product_id, url, alt_text, position, created_at')
      .eq('product_id', id)
      .order('position', { ascending: true }),
  ]);

  if (productResult.error) {
    return <AdminLoadError message={`Unable to load product: ${productResult.error.message}`} />;
  }
  if (!productResult.data) notFound();
  if (categoriesResult.error || imagesResult.error) {
    const error = categoriesResult.error || imagesResult.error;
    return <AdminLoadError message={`Unable to load product details: ${error?.message}`} />;
  }

  const product = productResult.data as Product;
  const categories = (categoriesResult.data ?? []) as Category[];
  const images = (imagesResult.data ?? []) as ProductImage[];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/admin/products" className="text-sm text-gray-600 hover:underline">
        ← Back to Products
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Edit product</h1>
          <p className="mt-1 text-sm text-gray-600">{product.name}</p>
        </div>
        <ProductDeleteButton productId={product.id} productName={product.name} />
      </div>

      <div className="mt-6 space-y-5">
        <ProductEditorForm product={product} categories={categories} />
        <ProductImageManager productId={product.id} initialImages={images} />
      </div>
    </main>
  );
}

function AdminLoadError({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/admin/products" className="text-sm text-gray-600 hover:underline">
        ← Back to Products
      </Link>
      <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {message}
      </p>
    </main>
  );
}
