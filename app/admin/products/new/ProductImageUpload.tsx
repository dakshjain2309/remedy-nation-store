
'use client';

import { useState } from 'react';

type Props = {
  onChange?: (files: File[]) => void;
};

export default function ProductImageUpload({ onChange }: Props) {
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState('');

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (files.length > 10) {
      setError('You can upload a maximum of 10 images.');
      return;
    }

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPG, PNG, and WebP images are allowed.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Each image must be smaller than 5 MB.');
        return;
      }
    }

    setError('');
    setImages(files);
    onChange?.(files);
  }

  return (
    <section style={{ marginTop: 24, marginBottom: 24 }}>
      <h2>Product Images</h2>

      <p>
        Select up to 10 images. The first image will be the main
        product image.
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
        <p>{images.length} image(s) selected.</p>
      )}
    </section>
  );
}
