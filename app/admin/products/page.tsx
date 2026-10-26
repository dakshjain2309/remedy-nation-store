import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Category, ProductImage } from '@/types';
import ProductDeleteButton from './ProductDeleteButton';

export const dynamic = 'force-dynamic';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  images: ProductImage[];
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
  if (adminError || isAdmin !== true) redirect('/');

  const [productResult, categoryResult, imageResult] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, slug, sku, price, compare_at_price, category_id, stock_quantity, is_active, is_featured')
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('id, name'),
    supabase
      .from('product_images')
      .select('id, product_id, url, alt_text, position, created_at')
      .order('position', { ascending: true }),
  ]);

  const loadError = productResult.error || categoryResult.error || imageResult.error;
  if (loadError) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/admin" className="text-sm text-gray-600 hover:underline">
          ← Back to Dashboard
        </Link>
        <h1 className="mt-5 text-2xl font-semibold text-gray-900">Product Management</h1>
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Unable to load products: {loadError.message}
        </p>
      </main>
    );
  }

  const categories = new Map(
    ((categoryResult.data ?? []) as Pick<Category, 'id' | 'name'>[]).map((category) => [
      category.id,
      category.name,
    ])
  );
  const imagesByProduct = new Map<string, ProductImage[]>();
  for (const image of (imageResult.data ?? []) as ProductImage[]) {
    const current = imagesByProduct.get(image.product_id) ?? [];
    current.push(image);
    imagesByProduct.set(image.product_id, current);
  }

  const products = ((productResult.data ?? []) as Omit<ProductRow, 'images'>[]).map((product) => ({
    ...product,
    images: imagesByProduct.get(product.id) ?? [],
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm text-gray-600 hover:underline">
        ← Back to Dashboard
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Product Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            {products.length} {products.length === 1 ? 'product' : 'products'} in your catalog
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
        >
          + Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-600">No products found.</p>
          <Link href="/admin/products/new" className="mt-3 inline-block text-sm font-medium underline">
            Add your first product
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {products.map((product) => (
              <article key={product.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex gap-3">
                  <ProductThumbnail product={product} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-medium text-gray-900">{product.name}</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      ₹{Number(product.price).toLocaleString('en-IN')}
                      {product.compare_at_price != null && (
                        <span className="ml-2 text-gray-400 line-through">
                          ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {product.sku || 'No SKU'} · {categories.get(product.category_id ?? '') || 'Uncategorized'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                  <ProductStatus product={product} />
                  <span className="text-sm text-gray-600">Stock: {product.stock_quantity}</span>
                  <ProductActions product={product} />
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  {['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductThumbnail product={product} />
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.sku || 'No SKU'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {categories.get(product.category_id ?? '') || 'Uncategorized'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ₹{Number(product.price).toLocaleString('en-IN')}
                      {product.compare_at_price != null && (
                        <span className="ml-2 text-xs text-gray-400 line-through">
                          ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{product.stock_quantity}</td>
                    <td className="px-4 py-3"><ProductStatus product={product} /></td>
                    <td className="px-4 py-3"><ProductActions product={product} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

function ProductThumbnail({ product }: { product: ProductRow }) {
  const image = product.images[0];
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt={image.alt_text || product.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
      )}
    </div>
  );
}

function ProductStatus({ product }: { product: ProductRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2.5 py-1 text-xs ${product.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
        {product.is_active ? 'Active' : 'Hidden'}
      </span>
      {product.is_featured && (
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">Featured</span>
      )}
    </div>
  );
}

function ProductActions({ product }: { product: ProductRow }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/admin/products/${product.id}/edit`}
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        Edit
      </Link>
      <ProductDeleteButton productId={product.id} productName={product.name} />
    </div>
  );
}
