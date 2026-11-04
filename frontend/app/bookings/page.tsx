'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';

type Hours = [string, string] | null;
type Service = { name: string; minutes: number; price: string };
type ClassTime = { name: string; day: string; time: string; minutes: number; capacity: number };
type Kind = 'appointments' | 'call' | 'sessions';
type Preset = 'instant' | 'approve' | 'calendar' | 'quiet';
type Settings = {
  enabled: boolean;
  preset: Preset;
  template: string | null;
  kind: Kind;
  callDetails: string;
  timezone: string;
  slotMinutes: number;
  daysAhead: number;
  hours: Record<string, Hours>;
  services: Service[];
  sessions: ClassTime[];
};
type Template = {
  id: string;
  name: string;
  kind: Kind;
  group: 'main' | 'more';
  summary: string;
  bestFor: string[];
};
type Proposal = { templateId: string; name: string; reason: string };
type ChatMessage = { role: 'user' | 'assistant'; content: string; proposal?: Proposal; added?: boolean };
type Booking = {
  id: string;
  startsAt: string;
  durationMin: number;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  status: 'confirmed' | 'requested';
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
// Plans that include online booking.
const BOOKING_PLANS = ['business', 'corporate'];

// What happens when someone books. The owner picks one; the server applies the same rules.
const PRESETS: { key: Preset; label: string; description: string; points: string[] }[] = [
  {
    key: 'instant',
    label: 'Instant, and email me',
    description: 'The booking is confirmed straight away.',
    points: ['Customer gets a confirmation email with a calendar invite', 'You get an email for each booking', 'Customer sees an Add to Google Calendar button'],
  },
  {
    key: 'approve',
    label: 'Approve first',
    description: 'You check each request before it is confirmed.',
    points: ['Customer gets a "request received" email', 'You get an email, then confirm it in this page', 'Confirming sends the customer their calendar invite'],
  },
  {
    key: 'calendar',
    label: 'Calendar only',
    description: 'Bookings are confirmed without any emails.',
    points: ['No emails to you or the customer', 'Customer sees an Add to Google Calendar button', 'Check this page for new bookings'],
  },
  {
    key: 'quiet',
    label: 'Quiet',
    description: 'Bookings are only kept here, with nothing sent.',
    points: ['No emails, and no calendar button', 'Check this page for new bookings'],
  },
];

const inputClass =
  'px-3 py-2 bg-white/[0.04] text-gray-100 rounded-lg border border-white/10 focus:border-white/40 outline-none transition';
const labelClass = 'block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2';
const cardClass = 'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6';

const defaultSettings = (): Settings => ({
  enabled: false,
  preset: 'instant',
  template: null,
  kind: 'appointments',
  callDetails: '',
  timezone: 'Europe/London',
  slotMinutes: 30,
  daysAhead: 14,
  hours: Object.fromEntries(DAYS.map((day) => [day.key, ['mon', 'tue', 'wed', 'thu', 'fri'].includes(day.key) ? ['09:00', '17:00'] : null])),
  services: [{ name: 'Consultation', minutes: 30, price: '' }],
  sessions: [],
});

const formatWhen = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));

export default function BookingsPage() {
  const [plan, setPlan] = useState('free');
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteId, setSiteId] = useState('');
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [chosenId, setChosenId] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const allowed = BOOKING_PLANS.includes(plan);
  const mainPresets = templates.filter((template) => template.group === 'main');
  const currentPreset = templates.find((template) => template.id === settings.template);
  const chosen = templates.find((template) => template.id === chosenId);

  useEffect(() => {
    apiFetch('/api/billing/me')
      .then((res) => res.json())
      .then((data) => data.plan && setPlan(data.plan))
      .catch(() => {});
    apiFetch('/api/bookings/presets')
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
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
    setChat([]);
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
  const setClass = (index: number, patch: Partial<ClassTime>) =>
    set({ sessions: settings.sessions.map((item, i) => (i === index ? { ...item, ...patch } : item)) });

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

  // Puts a preset in place. The server saves it straight away, so this only runs after the owner agrees.
  const applyPreset = async (id: string) => {
    const template = templates.find((item) => item.id === id);
    if (!template) return false;
    const ok = window.confirm(
      `Use "${template.name}"? This replaces your services, class times and opening hours. Your on/off setting, timezone and call details stay as they are.`
    );
    if (!ok) return false;
    setMessage('');
    setError('');
    try {
      const response = await apiFetch(`/api/bookings/sites/${siteId}/template`, { method: 'POST', json: { templateId: id } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not apply the preset');
      setSettings({ ...defaultSettings(), ...data.settings });
      setMessage(`"${template.name}" is now set up on your booking page.`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply the preset');
      return false;
    }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    const next: ChatMessage[] = [...chat, { role: 'user', content: text }];
    setChat(next);
    setChatInput('');
    setChatBusy(true);
    setChatError('');
    try {
      const response = await apiFetch(`/api/bookings/sites/${siteId}/advisor`, {
        method: 'POST',
        json: { messages: next.map(({ role, content }) => ({ role, content })) },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The booking assistant could not reply');
      setChat((current) => [...current, { role: 'assistant', content: data.reply || '', proposal: data.proposal || undefined }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'The booking assistant could not reply');
    } finally {
      setChatBusy(false);
    }
  };

  const addProposal = async (index: number, proposal: Proposal) => {
    const done = await applyPreset(proposal.templateId);
    if (done) setChat((current) => current.map((item, i) => (i === index ? { ...item, added: true } : item)));
  };

  const confirm = async (id: string) => {
    const response = await apiFetch(`/api/bookings/${id}/confirm`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) return setError(data.error || 'Could not confirm the booking');
    setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status: 'confirmed' } : booking)));
  };

  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this booking? The time will be free again.')) return;
    const response = await apiFetch(`/api/bookings/${id}`, { method: 'DELETE' });
    if (response.ok) setBookings((current) => current.filter((booking) => booking.id !== id));
    else setError('Could not cancel the booking');
  };

  const mainCardStyle = (active: boolean) =>
    `text-left rounded-xl border p-4 transition flex flex-col ${active ? 'border-white bg-white/[0.06]' : 'border-white/10 hover:border-white/30'}`;

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

              <section className={cardClass}>
                <p className={labelClass}>Start here: choose the type of booking</p>
                <p className="text-xs text-gray-400 mb-4">
                  Pick the one closest to your business. You can change any detail afterwards.
                  {currentPreset && <span className="text-gray-300"> Currently set up as: {currentPreset.name}.</span>}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mainPresets.map((template) => {
                    const active = settings.template === template.id;
                    return (
                      <div key={template.id} className={mainCardStyle(active)}>
                        <p className="text-sm font-medium text-white">{template.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{template.summary}</p>
                        <p className="text-xs text-gray-300 mt-3 font-medium">Works well for</p>
                        <ul className="text-xs text-gray-500 mt-1 space-y-1 list-disc pl-4">
                          {template.bestFor.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() => applyPreset(template.id)}
                          className={`mt-4 self-start text-sm px-3 py-2 rounded-lg transition ${active ? 'bg-white/[0.08] text-gray-300 cursor-default' : 'bg-white text-black hover:bg-gray-200'}`}
                          disabled={active}
                        >
                          {active ? 'In use' : 'Use this'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 border-t border-white/[0.06] pt-5">
                  <label className={labelClass} htmlFor="all-presets">
                    All presets
                  </label>
                  <select id="all-presets" className={`${inputClass} w-full`} value={chosenId} onChange={(e) => setChosenId(e.target.value)}>
                    <option value="">Choose a preset to read about it</option>
                    <optgroup label="Start here">
                      {mainPresets.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="More presets">
                      {templates
                        .filter((template) => template.group === 'more')
                        .map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  {chosen && (
                    <div className="mt-3 rounded-xl border border-white/10 p-4">
                      <p className="text-sm font-medium text-white">{chosen.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{chosen.summary}</p>
                      <p className="text-xs text-gray-300 mt-3 font-medium">Works well for</p>
                      <ul className="text-xs text-gray-500 mt-1 space-y-1 list-disc pl-4">
                        {chosen.bestFor.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => applyPreset(chosen.id)}
                        disabled={settings.template === chosen.id}
                        className="mt-4 bg-white hover:bg-gray-200 text-black px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40"
                      >
                        {settings.template === chosen.id ? 'In use' : 'Use this preset'}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className={cardClass}>
                <p className={labelClass}>Not sure which one? Ask the booking assistant</p>
                <p className="text-xs text-gray-400 mb-4">
                  Tell it about your business. It will suggest the best setup and explain why. Nothing changes until you choose to add it.
                </p>
                {chat.length === 0 && <p className="text-sm text-gray-500 mb-4">For example: &ldquo;I do hair appointments on weekdays and sometimes Saturdays.&rdquo;</p>}
                <div className="space-y-3 mb-4">
                  {chat.map((item, index) => (
                    <div key={index} className={item.role === 'user' ? 'text-right' : ''}>
                      <div className={`inline-block max-w-[90%] rounded-xl px-4 py-2.5 text-sm text-left whitespace-pre-wrap ${item.role === 'user' ? 'bg-white text-black' : 'bg-white/[0.06] text-gray-200'}`}>
                        {item.content}
                      </div>
                      {item.proposal && (
                        <div className="mt-2 rounded-xl border border-white/20 p-4 text-left">
                          <p className="text-xs uppercase tracking-wider text-gray-500">Recommended</p>
                          <p className="text-sm font-medium text-white mt-1">{item.proposal.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{item.proposal.reason}</p>
                          {item.added ? (
                            <p className="text-xs text-gray-300 mt-3">Added to your booking page.</p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addProposal(index, item.proposal as Proposal)}
                              className="mt-3 bg-white hover:bg-gray-200 text-black px-3 py-2 rounded-lg text-sm font-medium transition"
                            >
                              Add this to my booking system
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatBusy && <p className="text-xs text-gray-500">Thinking...</p>}
                </div>
                {chatError && <p className="text-sm text-red-400 mb-3">{chatError}</p>}
                <div className="flex gap-2">
                  <input
                    className={`${inputClass} flex-1`}
                    placeholder="Describe your business"
                    value={chatInput}
                    maxLength={2000}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendChat();
                    }}
                  />
                  <button type="button" onClick={sendChat} disabled={chatBusy || !chatInput.trim()} className="bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40">
                    Send
                  </button>
                </div>
                {chat.length > 0 && (
                  <button type="button" onClick={() => setChat([])} className="mt-3 text-xs text-gray-400 hover:text-gray-200">
                    Start again
                  </button>
                )}
              </section>

              <section className={cardClass}>
                <p className={labelClass}>When someone books</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PRESETS.map((preset) => {
                    const picked = settings.preset === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => set({ preset: preset.key })}
                        aria-pressed={picked}
                        className={`text-left rounded-xl border p-4 transition ${picked ? 'border-white bg-white/[0.06]' : 'border-white/10 hover:border-white/30'}`}
                      >
                        <p className="text-sm font-medium text-white">{preset.label}</p>
                        <p className="text-xs text-gray-400 mt-1">{preset.description}</p>
                        <ul className="text-xs text-gray-500 mt-3 space-y-1 list-disc pl-4">
                          {preset.points.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </section>

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
                  {settings.kind !== 'sessions' && (
                    <div>
                      <label className={labelClass}>Time between starts</label>
                      <select className={`${inputClass} w-full`} value={settings.slotMinutes} onChange={(e) => set({ slotMinutes: Number(e.target.value) })}>
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className={labelClass}>Days visitors can book ahead</label>
                    <input type="number" min={7} max={28} className={`${inputClass} w-full`} value={settings.daysAhead} onChange={(e) => set({ daysAhead: Number(e.target.value) })} />
                  </div>
                </div>

                {settings.kind === 'call' && (
                  <div>
                    <label className={labelClass}>What people receive after booking a call</label>
                    <input
                      className={`${inputClass} w-full`}
                      placeholder="Your phone number or video call link"
                      value={settings.callDetails}
                      maxLength={200}
                      onChange={(e) => set({ callDetails: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-2">Shown on the confirmation page and in the customer&apos;s email.</p>
                  </div>
                )}

                {settings.kind !== 'sessions' && (
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
                )}

                {settings.kind !== 'sessions' && (
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
                )}

                {settings.kind === 'sessions' && (
                  <div>
                    <p className={labelClass}>Classes and sessions</p>
                    <p className="text-xs text-gray-500 mb-3">These repeat every week. Each one stops taking bookings when its places are full.</p>
                    <div className="space-y-2">
                      {settings.sessions.map((item, index) => (
                        <div key={index} className="flex flex-wrap items-center gap-2">
                          <input className={`${inputClass} flex-1 min-w-[9rem]`} placeholder="Class name" value={item.name} maxLength={60} onChange={(e) => setClass(index, { name: e.target.value })} />
                          <select className={inputClass} value={item.day} onChange={(e) => setClass(index, { day: e.target.value })}>
                            {DAYS.map((day) => (
                              <option key={day.key} value={day.key}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                          <input type="time" className={inputClass} value={item.time} onChange={(e) => setClass(index, { time: e.target.value })} />
                          <input type="number" min={15} max={480} className={`${inputClass} w-24`} value={item.minutes} onChange={(e) => setClass(index, { minutes: Number(e.target.value) })} />
                          <span className="text-sm text-gray-500">minutes</span>
                          <input type="number" min={1} max={500} className={`${inputClass} w-24`} value={item.capacity} onChange={(e) => setClass(index, { capacity: Number(e.target.value) })} />
                          <span className="text-sm text-gray-500">places</span>
                          {settings.sessions.length > 1 && (
                            <button type="button" onClick={() => set({ sessions: settings.sessions.filter((_, i) => i !== index) })} className="text-sm text-gray-400 hover:text-gray-200">
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {settings.sessions.length < 20 && (
                      <button
                        type="button"
                        onClick={() => set({ sessions: [...settings.sessions, { name: '', day: 'tue', time: '18:30', minutes: 60, capacity: 10 }] })}
                        className="mt-3 text-sm text-gray-300 hover:text-white"
                      >
                        Add a class time
                      </button>
                    )}
                  </div>
                )}

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
                            {booking.status === 'requested' && <span className="text-amber-300 mr-2">Awaiting your confirmation ·</span>}
                            {booking.customerName} · {booking.customerEmail}
                            {booking.customerPhone ? ` · ${booking.customerPhone}` : ''}
                          </p>
                          {booking.notes && <p className="text-gray-500 mt-1">{booking.notes}</p>}
                        </div>
                        <div className="flex items-center gap-4">
                          {booking.status === 'requested' ? (
                            <button type="button" onClick={() => confirm(booking.id)} className="text-sm font-medium text-white hover:text-gray-200">
                              Confirm
                            </button>
                          ) : (
                            <span className="text-xs uppercase tracking-wider text-gray-500">Confirmed</span>
                          )}
                          <button type="button" onClick={() => cancel(booking.id)} className="text-sm text-gray-400 hover:text-red-300">
                            Cancel booking
                          </button>
                        </div>
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
