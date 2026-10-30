'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';

type Hours = [string, string] | null;
type Service = { name: string; minutes: number; price: string };
type Settings = {
  enabled: boolean;
  timezone: string;
  slotMinutes: number;
  daysAhead: number;
  hours: Record<string, Hours>;
  services: Service[];
};
type Booking = {
  id: string;
  startsAt: string;
  durationMin: number;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
};
type SiteRow = { id: string; slug: string; title: string; url: string };

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];
const TIMEZONES = [
  'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin', 'America/New_York',
  'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney',
];
// Plans that include online booking. Older plan names are listed because existing accounts still store them.
const BOOKING_PLANS = ['business', 'corporate', 'enterprise'];

const inputClass =
  'px-3 py-2 bg-white/[0.04] text-gray-100 rounded-lg border border-white/10 focus:border-white/40 outline-none transition';
const labelClass = 'block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2';
const cardClass = 'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6';

const defaultSettings = (): Settings => ({
  enabled: false,
  timezone: 'Europe/London',
  slotMinutes: 30,
  daysAhead: 14,
  hours: Object.fromEntries(DAYS.map((day) => [day.key, ['mon', 'tue', 'wed', 'thu', 'fri'].includes(day.key) ? ['09:00', '17:00'] : null])),
  services: [{ name: 'Consultation', minutes: 30, price: '' }],
});

const formatWhen = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));

export default function BookingsPage() {
  const [plan, setPlan] = useState('free');
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteId, setSiteId] = useState('');
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const allowed = BOOKING_PLANS.includes(plan);

  useEffect(() => {
    apiFetch('/api/billing/me')
      .then((res) => res.json())
      .then((data) => data.plan && setPlan(data.plan))
      .catch(() => {});
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
    apiFetch(`/api/bookings/sites/${siteId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load bookings');
        setSettings(data.settings ? { ...defaultSettings(), ...data.settings } : defaultSettings());
        setBookings(data.bookings || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load bookings'));
  }, [siteId]);

  const set = (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch }));
  const setHours = (key: string, hours: Hours) => set({ hours: { ...settings.hours, [key]: hours } });
  const setService = (index: number, patch: Partial<Service>) =>
    set({ services: settings.services.map((service, i) => (i === index ? { ...service, ...patch } : service)) });

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await apiFetch(`/api/bookings/sites/${siteId}/settings`, { method: 'PUT', json: settings });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save');
      setSettings({ ...defaultSettings(), ...data.settings });
      setMessage('Your booking settings are saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this booking? The time will be free again.')) return;
    const response = await apiFetch(`/api/bookings/${id}`, { method: 'DELETE' });
    if (response.ok) setBookings((current) => current.filter((booking) => booking.id !== id));
    else setError('Could not cancel the booking');
  };

  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-white/[0.06] px-4 md:px-8 py-4">
          <h1 className="text-base font-semibold text-white tracking-tight">Bookings</h1>
          <p className="text-gray-500 text-xs mt-0.5">Let visitors book a time on your website.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {!allowed ? (
            <div className={`${cardClass} max-w-xl space-y-3`}>
              <p className="text-sm font-medium text-white">Online booking is included in Business and above.</p>
              <p className="text-xs text-gray-400">Upgrade to let visitors book appointments straight from your website.</p>
              <Link href="/billing" className="inline-block bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition">
                See plans
              </Link>
            </div>
          ) : sites.length === 0 ? (
            <p className="text-sm text-gray-400">Publish a website first, then you can add bookings to it.</p>
          ) : (
            <div className="max-w-3xl space-y-6">
              <div>
                <label className={labelClass}>Website</label>
                <select className={`${inputClass} w-full`} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.title} ({site.slug}.venture-pro.io)
                    </option>
                  ))}
                </select>
              </div>

              <section className={`${cardClass} space-y-6`}>
                <label className="flex items-center gap-3 text-sm text-gray-200">
                  <input type="checkbox" checked={settings.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="h-4 w-4 accent-white" />
                  Show the booking form on my website
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Timezone</label>
                    <select className={`${inputClass} w-full`} value={settings.timezone} onChange={(e) => set({ timezone: e.target.value })}>
                      {TIMEZONES.map((zone) => (
                        <option key={zone} value={zone}>
                          {zone.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Time between starts</label>
                    <select className={`${inputClass} w-full`} value={settings.slotMinutes} onChange={(e) => set({ slotMinutes: Number(e.target.value) })}>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Days visitors can book ahead</label>
                    <input type="number" min={7} max={28} className={`${inputClass} w-full`} value={settings.daysAhead} onChange={(e) => set({ daysAhead: Number(e.target.value) })} />
                  </div>
                </div>

                <div>
                  <p className={labelClass}>Opening hours</p>
                  <div className="space-y-2">
                    {DAYS.map((day) => {
                      const hours = settings.hours[day.key];
                      return (
                        <div key={day.key} className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 w-36 text-sm text-gray-200">
                            <input
                              type="checkbox"
                              checked={Boolean(hours)}
                              onChange={(e) => setHours(day.key, e.target.checked ? ['09:00', '17:00'] : null)}
                              className="h-4 w-4 accent-white"
                            />
                            {day.label}
                          </label>
                          {hours ? (
                            <>
                              <input type="time" className={inputClass} value={hours[0]} onChange={(e) => setHours(day.key, [e.target.value, hours[1]])} />
                              <span className="text-gray-500 text-sm">to</span>
                              <input type="time" className={inputClass} value={hours[1]} onChange={(e) => setHours(day.key, [hours[0], e.target.value])} />
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">Closed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className={labelClass}>Services</p>
                  <div className="space-y-2">
                    {settings.services.map((service, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-2">
                        <input className={`${inputClass} flex-1 min-w-[10rem]`} placeholder="Service name" value={service.name} maxLength={60} onChange={(e) => setService(index, { name: e.target.value })} />
                        <input type="number" min={15} max={480} className={`${inputClass} w-28`} value={service.minutes} onChange={(e) => setService(index, { minutes: Number(e.target.value) })} />
                        <span className="text-sm text-gray-500">minutes</span>
                        <input className={`${inputClass} w-28`} placeholder="Price (optional)" value={service.price} maxLength={40} onChange={(e) => setService(index, { price: e.target.value })} />
                        {settings.services.length > 1 && (
                          <button type="button" onClick={() => set({ services: settings.services.filter((_, i) => i !== index) })} className="text-sm text-gray-400 hover:text-gray-200">
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {settings.services.length < 6 && (
                    <button
                      type="button"
                      onClick={() => set({ services: [...settings.services, { name: '', minutes: 60, price: '' }] })}
                      className="mt-3 text-sm text-gray-300 hover:text-white"
                    >
                      Add a service
                    </button>
                  )}
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}
                {message && <p className="text-sm text-gray-300">{message}</p>}
                <button type="button" onClick={save} disabled={saving} className="bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40">
                  {saving ? 'Saving...' : 'Save booking settings'}
                </button>
              </section>

              <section className={cardClass}>
                <h2 className="text-base font-semibold text-white mb-4">Upcoming bookings</h2>
                {bookings.length === 0 ? (
                  <p className="text-sm text-gray-400">No bookings yet. They will appear here as visitors book.</p>
                ) : (
                  <ul className="divide-y divide-white/[0.06]">
                    {bookings.map((booking) => (
                      <li key={booking.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                        <div className="text-sm">
                          <p className="text-white font-medium">
                            {formatWhen(booking.startsAt, settings.timezone)} · {booking.serviceName}
                          </p>
                          <p className="text-gray-400">
                            {booking.customerName} · {booking.customerEmail}
                            {booking.customerPhone ? ` · ${booking.customerPhone}` : ''}
                          </p>
                          {booking.notes && <p className="text-gray-500 mt-1">{booking.notes}</p>}
                        </div>
                        <button type="button" onClick={() => cancel(booking.id)} className="text-sm text-gray-400 hover:text-red-300">
                          Cancel booking
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
