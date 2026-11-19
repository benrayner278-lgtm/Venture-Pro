'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';

type Item = { id?: string; name: string; description: string; price: string };
type Order = { id: string; itemName: string; amountPence: number; customerName: string; customerEmail: string; createdAt: string };
type SiteRow = { id: string; slug: string; title: string };
type FormField = { id: string; label: string; type: string; required: boolean; options?: string[] };

const FIELD_NAMES: Record<string, string> = { text: 'Short text', textarea: 'Longer text', email: 'Email', phone: 'Phone', date: 'Date', time: 'Time', select: 'Choose one' };

const MAX_ITEMS = 12;

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

export default function ShopPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteId, setSiteId] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState<FormField[]>([]);
  const [description, setDescription] = useState('');
  const [writingForm, setWritingForm] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState('');
  const [bookingsOn, setBookingsOn] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/api/sites')
      .then((res) => res.json())
      .then((data) => {
        const list: SiteRow[] = data.sites || [];
        setSites(list);
        if (list[0]) setSiteId(list[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!siteId) return;
    setMessage('');
    setError('');
    apiFetch(`/api/shop/sites/${siteId}`)
      .then((res) => res.json())
      .then((data) => {
        setItems((data.items || []).map((item: { id: string; name: string; description: string; pricePence: number }) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: (item.pricePence / 100).toFixed(2),
        })));
        setOrders(data.orders || []);
        setForm(data.form || []);
        setContactEmail(data.contact?.email || '');
        setContactPhone(data.contact?.phone || '');
        setBookingsOn(Boolean(data.bookingsOn));
        setAllowed(data.allowed !== false);
        setPaymentsEnabled(Boolean(data.paymentsEnabled));
      })
      .catch(() => setError('Could not load the shop'));
  }, [siteId]);

  const update = (index: number, field: keyof Item, value: string) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  const save = async () => {
    setMessage('');
    setError('');
    const payload = [];
    for (const item of items) {
      const price = Number(item.price);
      if (!item.name.trim()) return setError('Every item needs a name');
      if (!Number.isFinite(price) || price < 0.5 || price > 5000) return setError(`${item.name || 'An item'}: the price must be between £0.50 and £5,000`);
      payload.push({ id: item.id, name: item.name.trim(), description: item.description.trim(), pricePence: Math.round(price * 100) });
    }
    setSaving(true);
    try {
      const response = await apiFetch(`/api/shop/sites/${siteId}`, { method: 'PUT', json: { items: payload } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save the shop');
      setItems(data.items.map((item: { id: string; name: string; description: string; pricePence: number }) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: (item.pricePence / 100).toFixed(2),
      })));
      setMessage('Shop saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the shop');
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async () => {
    setContactMessage('');
    setContactError('');
    try {
      const response = await apiFetch(`/api/shop/sites/${siteId}/contact`, { method: 'PUT', json: { email: contactEmail.trim(), phone: contactPhone.trim() } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save the contact details');
      setContactMessage('Contact details saved. They appear on your shop page only when nothing is for sale or booked online.');
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Could not save the contact details');
    }
  };

  const writeForm = async () => {
    setFormMessage('');
    setError('');
    setWritingForm(true);
    try {
      const response = await apiFetch(`/api/shop/sites/${siteId}/form`, { method: 'POST', json: { description: description.trim() } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not write the order form');
      setForm(data.form || []);
      setFormMessage('Order form saved. Customers will see these questions at checkout.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not write the order form');
    } finally {
      setWritingForm(false);
    }
  };

  const site = sites.find((entry) => entry.id === siteId);

  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-white/[0.06] px-4 md:px-8 py-4">
          <h1 className="text-base font-semibold text-white tracking-tight">Shop</h1>
          <p className="text-xs text-gray-500 mt-0.5">Sell items on your website. Customers pay you directly by card.</p>
        </div>

        <div className="p-4 md:p-8 max-w-3xl space-y-6">
          {sites.length > 1 && (
            <label className="block text-sm text-gray-300">
              Website
              <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="mt-1 block w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm">
                {sites.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.title || entry.slug}</option>
                ))}
              </select>
            </label>
          )}

          {!allowed && (
            <p className="text-sm text-amber-300 border border-amber-300/20 rounded-xl p-4">The shop is included in Premium and above. Upgrade on the Billing page to sell items.</p>
          )}
          {allowed && !paymentsEnabled && (
            <p className="text-sm text-amber-300 border border-amber-300/20 rounded-xl p-4">
              Set up card payments in <Link href="/settings" className="underline">Settings</Link> before customers can buy. You can add items now.
            </p>
          )}

          {site && (
            <p className="text-sm text-gray-400">
              Your shop page: <a className="underline text-gray-200" href={`https://${site.slug}.venture-pro.io/shop`} target="_blank" rel="noopener noreferrer">{site.slug}.venture-pro.io/shop</a>
            </p>
          )}

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-white">Items for sale</h2>
            {items.length === 0 && <p className="text-sm text-gray-500">No items yet. Add one below.</p>}
            {items.map((item, index) => (
              <div key={item.id || index} className="rounded-2xl border border-white/10 p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                  <input value={item.name} onChange={(e) => update(index, 'name', e.target.value)} maxLength={60} placeholder="Name, such as Blue mug" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
                  <input value={item.price} onChange={(e) => update(index, 'price', e.target.value)} inputMode="decimal" placeholder="Price £" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <textarea value={item.description} onChange={(e) => update(index, 'description', e.target.value)} maxLength={200} placeholder="Short description (optional)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm min-h-[60px]" />
                <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="text-xs text-gray-400 hover:text-white">
                  Remove item
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={items.length >= MAX_ITEMS || !allowed}
                onClick={() => setItems((current) => [...current, { name: '', description: '', price: '' }])}
                className="border border-white/10 text-gray-200 px-4 py-2 rounded-xl text-sm disabled:opacity-40"
              >
                Add item
              </button>
              <button type="button" onClick={save} disabled={saving || !allowed} className="bg-white text-black px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-40">
                {saving ? 'Saving…' : 'Save shop'}
              </button>
            </div>
            {message && <p className="text-sm text-green-400">{message}</p>}
            {error && <p className="text-sm text-red-400">{error}</p>}
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-white">Order form</h2>
            <p className="text-xs text-gray-500">
              Customers fill this in before they pay. Describe what you sell and the assistant writes the questions: a delivery address for products, a date and time for sessions or bookings.
            </p>
            <div className="rounded-2xl border border-white/10 p-4 space-y-3">
              <ul className="space-y-2 text-sm">
                {form.map((field) => (
                  <li key={field.id} className="flex justify-between gap-4 text-gray-200">
                    <span>
                      {field.label}
                      {!field.required && <span className="text-gray-500"> (optional)</span>}
                    </span>
                    <span className="text-xs text-gray-500">{FIELD_NAMES[field.type] || field.type}</span>
                  </li>
                ))}
              </ul>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              placeholder="For example: I sell handmade ceramic mugs, posted to the UK, or I run one-hour photography sessions at my studio."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm min-h-[70px]"
            />
            <div className="flex flex-wrap gap-3 items-center">
              <button type="button" onClick={writeForm} disabled={writingForm || !allowed || items.length === 0} className="border border-white/10 text-gray-200 px-4 py-2 rounded-xl text-sm disabled:opacity-40">
                {writingForm ? 'Writing…' : 'Write the order form with AI'}
              </button>
              {formMessage && <span className="text-sm text-green-400">{formMessage}</span>}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-white">Enquiry contact details</h2>
            <p className="text-xs text-gray-500">
              If you only take enquiries, not online sales or bookings, customers see these details on your shop page. Enter both, so they can reach you by email or phone.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" placeholder="Email address" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} type="tel" placeholder="Phone number, with area code" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <button type="button" onClick={saveContact} disabled={!allowed} className="border border-white/10 text-gray-200 px-4 py-2 rounded-xl text-sm disabled:opacity-40">
                Save contact details
              </button>
              {contactMessage && <span className="text-sm text-green-400">{contactMessage}</span>}
              {contactError && <span className="text-sm text-red-400">{contactError}</span>}
            </div>
            {bookingsOn && <p className="text-xs text-gray-500">Bookings are on, so customers can book on your shop page and these details stay hidden.</p>}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Orders</h2>
            {orders.length === 0 && <p className="text-sm text-gray-500">No orders yet.</p>}
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-white/10 p-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-100">{order.itemName}</span>
                  <span className="text-gray-100">{pounds(order.amountPence)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {order.customerName}{order.customerEmail ? ` · ${order.customerEmail}` : ''} · {new Date(order.createdAt).toLocaleDateString('en-GB')}
                </p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
