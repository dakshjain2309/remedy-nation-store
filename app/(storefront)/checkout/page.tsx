'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/lib/store/cart';
import { formatPrice } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { items, getSubtotal, clearCart } = useCartStore();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    payment: 'cod',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const subtotal = mounted ? getSubtotal() : 0;
  // COD-only test configuration; server uses the same fixed fees.
  const shipping = 0;
  const codFee = 50;
  const total = subtotal + shipping + codFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: form,
          items: items.map(item => ({
            product_id: item.product.id,
            variant_id: item.variant?.id ?? null,
            quantity: item.quantity,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.order_number) {
        throw new Error(result.error || 'Could not place order. Please try again.');
      }
      sessionStorage.setItem('rn-last-confirmed-order', JSON.stringify({
        order_number: result.order_number,
        total: result.total,
        name: form.name,
      }));
      clearCart();
      router.push('/checkout/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValid = Boolean(form.email && form.name && form.address && form.city && form.state && form.zip && form.phone && items.length);

  if (!mounted) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Back to store
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact */}
        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Contact</h2>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
          />
        </section>

        {/* Shipping */}
        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Shipping</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
            />
            <input
              type="text"
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
              />
              <input
                type="text"
                placeholder="ZIP code"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
            <input
              type="text"
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
            />
            <input
              type="tel"
              placeholder="Phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
        </section>

        {/* Payment */}
        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Payment</h2>
          <div className="space-y-2">
            <label className="flex items-center p-3 border border-black bg-gray-50 rounded-lg">
              <input type="radio" name="payment" checked readOnly className="mr-3" />
              <span className="text-sm">Cash on delivery (+₹50)</span>
            </label>
          </div>
        </section>

        {/* Summary */}
        <section className="border-t border-gray-100 pt-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Summary</h2>

          <div className="space-y-2 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.product.name} x {item.quantity}
                </span>
                <span>{formatPrice((item.variant?.price ?? item.product.price) * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-sm border-t border-gray-100 pt-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Shipping</span>
              <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
            </div>
            {form.payment === 'cod' && (
              <div className="flex justify-between">
                <span className="text-gray-500">COD fee</span>
                <span>{formatPrice(codFee)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between font-semibold text-lg mt-3 pt-3 border-t border-gray-200">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </section>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || loading}
          className={`w-full py-3 rounded-lg font-medium text-sm transition-all ${
            isValid && !loading
              ? 'bg-black text-white hover:bg-gray-800 active:scale-[0.99]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? 'Processing...' : 'Complete order'}
        </button>

        <p className="text-xs text-center text-gray-400">
          By clicking "Complete order" you agree to our terms and conditions
        </p>
      </form>
    </main>
  );
}
