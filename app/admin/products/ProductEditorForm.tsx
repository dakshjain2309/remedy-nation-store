'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Product } from '@/types';
import { updateProduct } from './actions';

export default function ProductEditorForm({
  product,
  categories,
}: {
  product: Product;
  categories: Category[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const formData = new FormData(event.currentTarget);
      await updateProduct(formData);
      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update product.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-700';
  const labelClass = 'block text-sm font-medium text-gray-700';

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <input type="hidden" name="product_id" value={product.id} />
      <input type="hidden" name="slug" value={product.slug} />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Product name
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={product.name}
            className={inputClass}
          />
        </label>

        <label className={`${labelClass} sm:col-span-2`}>
          Description
          <textarea
            name="description"
            rows={5}
            maxLength={10000}
            defaultValue={product.description ?? ''}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Selling price (₹)
          <input
            name="price"
            type="number"
            min="0"
            max="99999999.99"
            step="0.01"
            required
            defaultValue={product.price}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Compare-at price (₹)
          <input
            name="compare_at_price"
            type="number"
            min="0"
            max="99999999.99"
            step="0.01"
            defaultValue={product.compare_at_price ?? ''}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          SKU
          <input
            name="sku"
            maxLength={200}
            defaultValue={product.sku ?? ''}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Category
          <select name="category_id" defaultValue={product.category_id ?? ''} className={inputClass}>
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Stock quantity
          <input
            name="stock_quantity"
            type="number"
            min="0"
            max="2147483647"
            step="1"
            required
            defaultValue={product.stock_quantity}
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="is_active" defaultChecked={product.is_active} className="h-4 w-4 accent-gray-900" />
          Active — visible in the store
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="is_featured" defaultChecked={product.is_featured} className="h-4 w-4 accent-gray-900" />
          Featured product
        </label>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saved && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">Product details saved.</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="min-h-11 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to products
        </button>
      </div>
    </form>
  );
}
