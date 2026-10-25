
'use client';

import { useState } from 'react';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export default function ProductImageUpload() {
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState('');

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []);

    if (files.length > MAX_IMAGES) {
      setError('Maximum 10 images are allowed.');
      setImages([]);
      event.target.value = '';
      return;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only JPG, PNG and WebP images are allowed.');
        setImages([]);
        event.target.value = '';
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('Each image must be 5 MB or smaller.');
        setImages([]);
        event.target.value = '';
        return;
      }
    }

    setError('');
    setImages(files);
  }

  return (
    <section style={{ marginTop: 24, marginBottom: 24 }}>
      <h2>Product Images</h2>

      <p>
        Select up to 10 images. The first image will be
        the main product image.
      </p>

      <input
        type="file"
        name="product_images"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleChange}
      />

      {error && (
        <p role="alert" style={{ color: 'red' }}>
          {error}
        </p>
      )}

      {images.length > 0 && (
        <p>{images.length} of 10 images selected.</p>
      )}
    </section>
  );
}
