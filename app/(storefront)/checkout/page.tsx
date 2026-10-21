'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

type Receipt = { order_number: string; total: number; name: string };

export default function CheckoutSuccessPage() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('rn-last-confirmed-order');
      if (raw) setReceipt(JSON.parse(raw) as Receipt);
    } catch { /* No local receipt available */ }
    setLoaded(true);
  }, []);
  return (
    <main className="max-w-2xl mx-auto px-4 py-16 text-center">
      {!loaded ? <p>Loading...</p> : receipt ? <>
        <h1 className="text-2xl font-semibold mb-4">Order confirmed!</h1>
        <p className="mb-2">Thank you, {receipt.name}. Your cash-on-delivery order has been saved.</p>
        <p className="mb-2">Order number: <strong>{receipt.order_number}</strong></p>
        <p className="mb-6">Total payable on delivery: <strong>{formatPrice(receipt.total)}</strong></p>
        <p className="text-sm text-gray-500 mb-6">Save your order number for reference. No online payment has been collected.</p>
      </> : <p className="mb-6">No order confirmation is available in this browser session.</p>}
      <Link href="/" className="text-blue-600 hover:underline">Back to store</Link>
    </main>
  );
}
