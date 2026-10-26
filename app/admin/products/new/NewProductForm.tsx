
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { uploadProductImage } from '../actions';
import ProductImageUpload from './ProductImageUpload';

type Props = {
  createProduct: (
    formData: FormData
  ) => Promise<{ productId: string }>;
};

export default function NewProductForm({ createProduct }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError('');
    setStatus('Creating product...');

    const form = event.currentTarget;
    const formData = new FormData(form);
    let productWasCreated = false;

    try {
      const files = formData.getAll('product_images').filter(
        (item): item is File => item instanceof File && item.size > 0
      );

      if (files.length > 10) {
        throw new Error('Maximum 10 images are allowed.');
      }

      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error('Only JPG, PNG and WebP images are allowed.');
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Each image must be 5 MB or smaller.');
        }
      }

      // Images are uploaded separately, not sent to the Server Action.
      formData.delete('product_images');

      const { productId } = await createProduct(formData);
      productWasCreated = true;

      for (let index = 0; index < files.length; index++) {
        setStatus(`Uploading image ${index + 1} of ${files.length}...`);
        const imageFormData = new FormData();
        imageFormData.set('product_id', productId);
        imageFormData.set('image', files[index]);
        await uploadProductImage(imageFormData);
      }

      setStatus('Product saved successfully.');
      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save product.';
      setError(productWasCreated
        ? `Product was created, but image upload was incomplete: ${message} Open the product editor to retry.`
        : message);
      setStatus('');
    } finally {
      setSaving(false);
    }
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
    <form onSubmit={handleSubmit}>
      <label htmlFor="name">Product Name *</label>
      <input id="name" name="name" required maxLength={200} style={inputStyle} />

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
      <textarea id="description" name="description" rows={5} style={inputStyle} />

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
        <input type="checkbox" name="is_active" defaultChecked />{' '}
        Active — Show product on website
      </label>

      <label style={{ display: 'block', marginBottom: 24 }}>
        <input type="checkbox" name="is_featured" />{' '}
        Featured Product
      </label>

      <ProductImageUpload />

      {status && <p role="status">{status}</p>}
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      <button
        type="submit"
        disabled={saving}
        style={{
          padding: '14px 24px',
          background: '#222',
          color: '#fff',
          border: 0,
          borderRadius: 8,
          cursor: saving ? 'wait' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save Product'}
      </button>
    </form>
  );
}
