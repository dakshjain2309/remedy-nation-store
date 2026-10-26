'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteOrArchiveProduct } from './actions';

export default function ProductDeleteButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setBusy(true);
    setError('');
    try {
      const result = await deleteOrArchiveProduct(productId);
      setConfirming(false);
      router.refresh();
      if (result.warning) {
        window.alert(result.warning);
      } else if (result.result === 'archived') {
        window.alert('This product has order history, so it was archived instead of permanently deleted.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove product.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError('');
          setConfirming(true);
        }}
        className="text-sm font-medium text-red-700 hover:underline"
      >
        Delete
      </button>
      {error && <p role="alert" className="basis-full text-xs text-red-700">{error}</p>}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setConfirming(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${productId}`}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 id={`delete-title-${productId}`} className="text-lg font-semibold text-gray-900">
              Remove product?
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              “{productName}” will be permanently deleted only if it has no order history.
              Products referenced by orders will be archived instead so order records stay intact.
            </p>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="min-h-10 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {busy ? 'Removing…' : 'Confirm'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
