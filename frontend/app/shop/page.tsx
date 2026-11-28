'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';
import { compressPhoto } from '@/lib/imageUpload';
import { PageHeader } from '@/components/theme';

type Item = { id?: string; name: string; description: string; price: string; photos: string[] };
type Order = { id: string; itemName: string; amountPence: number; customerName: string; customerEmail: string; createdAt: string };
type SiteRow = { id: string; slug: string; title: string };
type FormField = { id: string; label: string; type: string; required: boolean; options?: string[] };
type ClassRow = { id: string; name: string; minutes: string; capacity: string; price: string; instruction: string; occurrences: string[]; photos: string[]; timezone?: string };
type SavedClass = { id: string; name: string; minutes: number; capacity: number; pricePence: number; instruction: string; occurrences: string[]; photos?: string[] };
type SavedItem = { id: string; name: string; description: string; pricePence: number; photos?: string[] };
// The draft the setup assistant builds. It is only saved when the owner clicks Apply.
type SetupDraft = {
  shopItems?: { id?: string; name: string; description: string; pricePence: number }[];
  classes?: SavedClass[];
  shopForm?: FormField[];
  contact?: { email: string; phone: string };
  bookingSettings?: { services: { name: string; minutes: number; pricePence: number }[] } & Record<string, unknown>;
};
type SetupMessage = { role: 'owner' | 'assistant'; text: string };

const FIELD_NAMES: Record<string, string> = { text: 'Short text', textarea: 'Longer text', email: 'Email', phone: 'Phone', date: 'Date', time: 'Time', select: 'Choose one' };

const MAX_ITEMS = 12;

const MAX_CLASSES = 8;
const MAX_PHOTOS = 7;
// Keep in step with MAX_PHOTO_CHARS in the backend (lib/photos.js).
const PHOTO_CHARS = 150000;

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const emptyClass = (): ClassRow => ({ id: Math.random().toString(36).slice(2, 10), name: '', minutes: '60', capacity: '', price: '', instruction: '', occurrences: [], photos: [] });

const toItems = (list: SavedItem[]): Item[] =>
  list.map((item) => ({ id: item.id, name: item.name, description: item.description || '', price: (item.pricePence / 100).toFixed(2), photos: item.photos || [] }));

const toRows = (list: SavedClass[]): ClassRow[] =>
  list.map((cls) => ({
    id: cls.id,
    name: cls.name,
    minutes: String(cls.minutes),
    capacity: String(cls.capacity),
    price: (cls.pricePence / 100).toFixed(2),
    instruction: cls.instruction || '',
    occurrences: cls.occurrences || [],
    photos: cls.photos || [],
  }));

const formatWhen = (iso: string, timezone = 'Europe/London') =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: timezone });

// Photos for one item or class: up to MAX_PHOTOS, each resized to fit the stored size.
function PhotoEditor({ photos, onChange }: { photos: string[]; onChange: (next: string[]) => void }) {
  const [note, setNote] = useState('');
  const add = async (files: FileList | null) => {
    if (!files) return;
    setNote('');
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return setNote(`Up to ${MAX_PHOTOS} photos`);
    const picked = Array.from(files).slice(0, room);
    try {
      const added = await Promise.all(picked.map((file) => compressPhoto(file, PHOTO_CHARS)));
      onChange([...photos, ...added]);
      if (files.length > room) setNote(`Only ${room} more fit. Up to ${MAX_PHOTOS} photos.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not add that photo');
    }
  };
  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-20 w-20 rounded-lg object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => onChange(photos.filter((_, k) => k !== i))} className="absolute -top-2 -right-2 rounded-full bg-black/80 px-1.5 text-xs text-white">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <label className={`inline-block text-xs underline ${photos.length >= MAX_PHOTOS ? 'text-gray-600' : 'cursor-pointer text-gray-300'}`}>
        {photos.length >= MAX_PHOTOS ? `${MAX_PHOTOS} photos added` : `Add photos (${photos.length} of ${MAX_PHOTOS})`}
        <input type="file" accept="image/*" multiple className="hidden" disabled={photos.length >= MAX_PHOTOS} onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </label>
      {note && <p className="text-xs text-red-400">{note}</p>}
    </div>
  );
}

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
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classNote, setClassNote] = useState<Record<number, string>>({});
  const [classBusy, setClassBusy] = useState<number | null>(null);
  const [classesSaved, setClassesSaved] = useState('');
  const [setupMessages, setSetupMessages] = useState<SetupMessage[]>([]);
  const [setupInput, setSetupInput] = useState('');
  const [setupDraft, setSetupDraft] = useState<SetupDraft>({});
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupApplied, setSetupApplied] = useState('');
  // The assistant's chat and draft are kept in this browser only, per site, so a refresh does not lose them.
  // Nothing here is saved to the site until Apply.
  const setupKey = `vp-setup:${siteId}`;
  // The first save after a load would write the empty starting state over the saved chat, so it is skipped.
  const skipNextSave = useRef(false);
  useEffect(() => {
    if (!siteId) return;
    skipNextSave.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(setupKey) || 'null');
      setSetupMessages(Array.isArray(saved?.messages) ? saved.messages : []);
      setSetupDraft(saved?.draft && typeof saved.draft === 'object' ? saved.draft : {});
    } catch {
      setSetupMessages([]);
      setSetupDraft({});
    }
  }, [siteId, setupKey]);
  useEffect(() => {
    if (!siteId) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    try {
      localStorage.setItem(setupKey, JSON.stringify({ messages: setupMessages, draft: setupDraft }));
    } catch {
      /* private browsing: the chat lasts until the page closes */
    }
  }, [siteId, setupKey, setupMessages, setupDraft]);

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
        setItems(toItems(data.items || []));
        setOrders(data.orders || []);
        setForm(data.form || []);
        setContactEmail(data.contact?.email || '');
        setContactPhone(data.contact?.phone || '');
        setBookingsOn(Boolean(data.bookingsOn));
        setAllowed(data.allowed !== false);
        setPaymentsEnabled(Boolean(data.paymentsEnabled));
        setClasses(toRows(data.classes || []));
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
      payload.push({ id: item.id, name: item.name.trim(), description: item.description.trim(), pricePence: Math.round(price * 100), photos: item.photos });
    }
    setSaving(true);
    try {
      const response = await apiFetch(`/api/shop/sites/${siteId}`, { method: 'PUT', json: { items: payload } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save the shop');
      setItems(toItems(data.items || []));
      setMessage('Shop saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the shop');
    } finally {
      setSaving(false);
    }
  };

  const updateClass = (index: number, patch: Partial<ClassRow>) =>
    setClasses((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  // Asks the assistant for the dates from the owner's words. Nothing is saved until Save classes.
  const makeDates = async (index: number) => {
    const row = classes[index];
    const minutes = Number(row.minutes);
    if (!row.name.trim()) return setClassNote((n) => ({ ...n, [index]: 'Give the class a name first' }));
    if (!(minutes >= 15 && minutes <= 480)) return setClassNote((n) => ({ ...n, [index]: 'Enter how long it lasts, between 15 and 480 minutes' }));
    if (!row.instruction.trim()) return setClassNote((n) => ({ ...n, [index]: 'Describe when it runs first' }));
    setClassBusy(index);
    setClassNote((n) => ({ ...n, [index]: '' }));
    try {
      const response = await apiFetch(`/api/shop/sites/${siteId}/classes/preview`, { method: 'POST', json: { name: row.name.trim(), minutes, instruction: row.instruction.trim() } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not make the dates');
      updateClass(index, { occurrences: data.occurrences, timezone: data.timezone });
      setClassNote((n) => ({
        ...n,
        [index]: data.truncated
          ? `That pattern has more dates than fit. The first ${data.occurrences.length} are listed. Save these, then make the rest later.`
          : `${data.occurrences.length} dates made. Remove any you do not want, then save.`,
      }));
    } catch (err) {
      setClassNote((n) => ({ ...n, [index]: err instanceof Error ? err.message : 'Could not make the dates' }));
    } finally {
      setClassBusy(null);
    }
  };

  const saveClasses = async () => {
    setClassesSaved('');
    setError('');
    const payload = [];
    for (const row of classes) {
      const price = Number(row.price || 0);
      if (!row.name.trim()) return setError('Every class or session needs a name');
      if (!Number.isFinite(price) || price < 0 || price > 5000) return setError(`${row.name}: the price must be between £0 and £5,000`);
      payload.push({ id: row.id, name: row.name.trim(), minutes: Number(row.minutes), capacity: Number(row.capacity), pricePence: Math.round(price * 100), instruction: row.instruction.trim(), occurrences: row.occurrences, photos: row.photos });
    }
    setClassBusy(-1);
    try {
      const response = await apiFetch(`/api/shop/sites/${siteId}/classes`, { method: 'PUT', json: { classes: payload } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save the classes');
      setClasses(toRows(data.classes || []));
      setClassesSaved('Classes saved. Customers can now choose these dates and times on your shop page.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the classes');
    } finally {
      setClassBusy(null);
    }
  };

  // Sends the owner's words to the setup assistant. The draft it returns is shown, and only Apply saves it.
  const askSetup = async () => {
    const message = setupInput.trim();
    if (!message) return;
    setSetupError('');
    setSetupApplied('');
    setSetupBusy(true);
    setSetupMessages((current) => [...current, { role: 'owner', text: message }]);
    setSetupInput('');
    try {
      const response = await apiFetch(`/api/shop/sites/${siteId}/setup`, { method: 'POST', json: { message, draft: setupDraft } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The assistant could not finish that');
      setSetupDraft(data.draft || {});
      setSetupMessages((current) => [...current, { role: 'assistant', text: data.reply || 'Done.' }]);
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'The assistant could not finish that');
    } finally {
      setSetupBusy(false);
    }
  };

  // Saves the draft with the same routes as the manual forms, which check everything again.
  const applySetup = async () => {
    setSetupError('');
    setSetupApplied('');
    setSetupBusy(true);
    try {
      if (setupDraft.shopItems) {
        const response = await apiFetch(`/api/shop/sites/${siteId}`, { method: 'PUT', json: { items: setupDraft.shopItems } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not save the items');
        setItems(toItems(data.items || []));
      }
      if (setupDraft.classes) {
        const response = await apiFetch(`/api/shop/sites/${siteId}/classes`, { method: 'PUT', json: { classes: setupDraft.classes } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not save the classes');
        setClasses(toRows(data.classes || []));
      }
      if (setupDraft.shopForm) {
        const fields = setupDraft.shopForm.slice(2);
        const response = await apiFetch(`/api/shop/sites/${siteId}/form`, { method: 'PUT', json: { fields } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not save the order form');
        setForm(data.form || []);
      }
      if (setupDraft.contact) {
        const response = await apiFetch(`/api/shop/sites/${siteId}/contact`, { method: 'PUT', json: setupDraft.contact });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not save the contact details');
        setContactEmail(setupDraft.contact.email);
        setContactPhone(setupDraft.contact.phone);
      }
      if (setupDraft.bookingSettings) {
        const response = await apiFetch(`/api/bookings/sites/${siteId}/settings`, { method: 'PUT', json: setupDraft.bookingSettings });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not save the booking settings');
        setBookingsOn(true);
      }
      setSetupApplied('Applied to your shop. Check the sections below, then publish when you are happy.');
      setSetupDraft({});
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Could not apply the draft');
    } finally {
      setSetupBusy(false);
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
        <PageHeader title="Shop" subtitle="Sell items on your website. Customers pay you directly by card." accent="tomato" />

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
            <h2 className="text-sm font-semibold text-white">Set up with the assistant</h2>
            <p className="text-xs text-gray-500">
              Tell the assistant what you sell, your classes and the questions you need answered. It builds a draft for you to check. Nothing is saved until you click Apply.
            </p>
            {setupMessages.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {setupMessages.map((message, index) => (
                  <p key={index} className={`text-sm rounded-xl px-3 py-2 ${message.role === 'owner' ? 'bg-white/[0.06] text-gray-100 ml-8' : 'text-gray-300 mr-8'}`}>
                    {message.text}
                  </p>
                ))}
              </div>
            )}
            <textarea
              value={setupInput}
              onChange={(e) => setSetupInput(e.target.value)}
              maxLength={1000}
              placeholder="For example: I sell tennis shoes at £120, and run a group run every weekday from 6am to 10am, every hour, until the new year, for 10 people at £15."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm min-h-[70px]"
            />
            <div className="flex flex-wrap gap-3 items-center">
              <button type="button" onClick={askSetup} disabled={setupBusy || !allowed || !setupInput.trim()} className="border border-white/10 text-gray-200 px-4 py-2 rounded-xl text-sm disabled:opacity-40">
                {setupBusy ? 'Working…' : 'Send'}
              </button>
              {setupError && <span className="text-sm text-red-400">{setupError}</span>}
            </div>
            {(setupDraft.shopItems || setupDraft.classes || setupDraft.shopForm || setupDraft.contact || setupDraft.bookingSettings) && (
              <div className="rounded-2xl border border-white/10 p-4 space-y-3 text-sm">
                <p className="text-xs uppercase tracking-wider text-gray-500">Draft to check</p>
                {setupDraft.shopItems && (
                  <div>
                    <p className="text-gray-300">Items</p>
                    <ul className="text-gray-100">{setupDraft.shopItems.map((item, i) => <li key={i}>{item.name} · {pounds(item.pricePence)}</li>)}</ul>
                  </div>
                )}
                {setupDraft.classes && (
                  <div>
                    <p className="text-gray-300">Classes and sessions</p>
                    <ul className="text-gray-100">{setupDraft.classes.map((cls, i) => <li key={i}>{cls.name} · {cls.occurrences.length} dates · {cls.capacity} places</li>)}</ul>
                  </div>
                )}
                {setupDraft.bookingSettings && (
                  <div>
                    <p className="text-gray-300">Online booking</p>
                    <ul className="text-gray-100">{setupDraft.bookingSettings.services.map((service, i) => <li key={i}>{service.name} · {service.minutes} min · {service.pricePence > 0 ? pounds(service.pricePence) : 'Free'}</li>)}</ul>
                  </div>
                )}
                {setupDraft.contact && (
                  <div>
                    <p className="text-gray-300">Enquiry details</p>
                    <ul className="text-gray-100"><li>{setupDraft.contact.email}</li><li>{setupDraft.contact.phone}</li></ul>
                  </div>
                )}
                {setupDraft.shopForm && (
                  <div>
                    <p className="text-gray-300">Questions at checkout</p>
                    <ul className="text-gray-100">{setupDraft.shopForm.slice(2).map((field) => <li key={field.id}>{field.label}</li>)}</ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 items-center">
                  <button type="button" onClick={applySetup} disabled={setupBusy} className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40">
                    Apply to my shop
                  </button>
                  <button type="button" onClick={() => setSetupDraft({})} className="text-xs text-gray-400 hover:text-white">
                    Discard draft
                  </button>
                </div>
              </div>
            )}
            {setupApplied && <p className="text-sm text-green-400">{setupApplied}</p>}
          </section>

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
                <PhotoEditor photos={item.photos} onChange={(next) => setItems((current) => current.map((entry, i) => (i === index ? { ...entry, photos: next } : entry)))} />
                <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="text-xs text-gray-400 hover:text-white">
                  Remove item
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={items.length >= MAX_ITEMS || !allowed}
                onClick={() => setItems((current) => [...current, { name: '', description: '', price: '', photos: [] }])}
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
            <h2 className="text-sm font-semibold text-white">Classes and sessions with dates</h2>
            <p className="text-xs text-gray-500">
              Each class or session has its own dates and times. Describe when it runs, for example: every Tuesday to Friday, 10am to 5pm, one class every hour on the hour, for the next 6 months, except every 4th week when I don&apos;t run Tuesdays. Check the list, remove any dates you don&apos;t want, then save. Customers can only book a time that still has places. Put classes here rather than in Items for sale.
            </p>
            {classes.map((row, index) => (
              <div key={row.id} className="rounded-2xl border border-white/10 p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-[1fr_110px_110px_120px]">
                  <input value={row.name} onChange={(e) => updateClass(index, { name: e.target.value })} maxLength={60} placeholder="Class name, such as Group Run" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
                  <input value={row.minutes} onChange={(e) => updateClass(index, { minutes: e.target.value })} inputMode="numeric" placeholder="Minutes" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
                  <input value={row.capacity} onChange={(e) => updateClass(index, { capacity: e.target.value })} inputMode="numeric" placeholder="People allowed" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
                  <input value={row.price} onChange={(e) => updateClass(index, { price: e.target.value })} inputMode="decimal" placeholder="Price £ (0 = free)" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <textarea value={row.instruction} onChange={(e) => updateClass(index, { instruction: e.target.value })} maxLength={300} placeholder="When does it run? Describe it in your own words." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm min-h-[60px]" />
                <PhotoEditor photos={row.photos} onChange={(next) => updateClass(index, { photos: next })} />
                <div className="flex flex-wrap gap-3 items-center">
                  <button type="button" onClick={() => makeDates(index)} disabled={classBusy !== null || !allowed} className="border border-white/10 text-gray-200 px-4 py-2 rounded-xl text-sm disabled:opacity-40">
                    {classBusy === index ? 'Making dates…' : row.occurrences.length > 0 ? 'Make the dates again' : 'Make the dates'}
                  </button>
                  <button type="button" onClick={() => setClasses((current) => current.filter((_, i) => i !== index))} className="text-xs text-gray-400 hover:text-white">
                    Remove class
                  </button>
                  {classNote[index] && <span className="text-xs text-gray-300">{classNote[index]}</span>}
                </div>
                {row.occurrences.length > 0 && (
                  <>
                    <p className="text-xs text-gray-500">{row.occurrences.length} dates and times</p>
                    <div className="max-h-80 overflow-y-auto rounded-xl border border-white/10">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-black text-left text-xs text-gray-500">
                          <tr>
                            <th className="px-3 py-2 font-normal">Date and time</th>
                            <th className="px-3 py-2 font-normal" />
                          </tr>
                        </thead>
                        <tbody>
                          {row.occurrences.map((iso, k) => (
                            <tr key={iso} className="border-t border-white/[0.06]">
                              <td className="px-3 py-2 text-gray-200">{formatWhen(iso, row.timezone)}</td>
                              <td className="px-3 py-2 text-right">
                                <button type="button" onClick={() => updateClass(index, { occurrences: row.occurrences.filter((_, i) => i !== k) })} className="text-xs text-gray-400 hover:text-white">
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={classes.length >= MAX_CLASSES || !allowed} onClick={() => setClasses((current) => [...current, emptyClass()])} className="border border-white/10 text-gray-200 px-4 py-2 rounded-xl text-sm disabled:opacity-40">
                Add a class or session
              </button>
              <button type="button" onClick={saveClasses} disabled={!allowed || classBusy !== null} className="bg-white text-black px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-40">
                {classBusy === -1 ? 'Saving…' : 'Save classes'}
              </button>
            </div>
            {classesSaved && <p className="text-sm text-green-400">{classesSaved}</p>}
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
