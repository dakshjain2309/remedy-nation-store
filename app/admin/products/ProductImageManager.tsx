'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import type { ProductImage } from '@/types';
import {
  removeProductImage,
  reorderProductImages,
  uploadProductImage,
} from './actions';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function ProductImageManager({
  productId,
  initialImages,
}: {
  productId: string;
  initialImages: ProductImage[];
}) {
  const [images, setImages] = useState(initialImages);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setError('');
    setStatus('');

    if (images.length + files.length > MAX_IMAGES) {
      setError(`A product can have at most ${MAX_IMAGES} images.`);
      event.target.value = '';
      return;
    }
    const invalidFile = files.find((file) =>
      !ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE
    );
    if (invalidFile) {
      setError(!ALLOWED_TYPES.has(invalidFile.type)
        ? 'Only JPG, PNG, and WebP images are allowed.'
        : 'Each image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setBusy(true);
    try {
      for (const [index, file] of files.entries()) {
        setStatus(`Uploading image ${index + 1} of ${files.length}…`);
        const formData = new FormData();
        formData.set('product_id', productId);
        formData.set('image', file);
        const image = await uploadProductImage(formData);
        setImages((current) => [...current, image].sort((a, b) => a.position - b.position));
      }
      setStatus(files.length ? `${files.length} image${files.length === 1 ? '' : 's'} uploaded.` : '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to upload image.');
      setStatus('Images uploaded before the error are saved; you can retry the remaining files.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length || busy) return;
    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await reorderProductImages(productId, reordered.map((image) => image.id));
      setImages(reordered.map((image, position) => ({ ...image, position })));
      setStatus('Image order saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reorder images.');
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(image: ProductImage) {
    if (!window.confirm('Remove this image from the product?')) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const result = await removeProductImage(productId, image.id);
      setImages((current) => current
        .filter((item) => item.id !== image.id)
        .map((item, position) => ({ ...item, position })));
      if (result.warning) setError(result.warning);
      else setStatus('Image removed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Product images</h2>
          <p className="mt-1 text-sm text-gray-600">
            The first image is shown as the main product image. Reorder images with the arrows.
          </p>
        </div>
        <span className="text-sm text-gray-500">{images.length}/{MAX_IMAGES}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {images.map((image, index) => (
          <article key={image.id} className="overflow-hidden rounded-lg border border-gray-200">
            <div className="aspect-square bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt_text || `Product image ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between gap-1 p-2">
              <span className="text-xs text-gray-600">Image {index + 1}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label={`Move image ${index + 1} earlier`}
                  disabled={busy || index === 0}
                  onClick={() => moveImage(index, -1)}
                  className="h-8 w-8 rounded border border-gray-200 text-gray-700 disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move image ${index + 1} later`}
                  disabled={busy || index === images.length - 1}
                  onClick={() => moveImage(index, 1)}
                  className="h-8 w-8 rounded border border-gray-200 text-gray-700 disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove image ${index + 1}`}
                  disabled={busy}
                  onClick={() => removeImage(image)}
                  className="h-8 rounded border border-red-200 px-2 text-xs font-medium text-red-700 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {images.length === 0 && <p className="mt-4 text-sm text-gray-500">No images added yet.</p>}

      <div className="mt-5">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || images.length >= MAX_IMAGES}
          onChange={handleFiles}
          className="block w-full text-sm text-gray-600 file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:font-medium file:text-gray-800 hover:file:bg-gray-200 disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP; maximum 5 MB per image.</p>
      </div>

      {status && <p role="status" className="mt-3 text-sm text-gray-600">{status}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
