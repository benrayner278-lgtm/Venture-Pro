'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import {
  DEFAULT_LOGO,
  LOGO_FONTS,
  LOGO_ICONS,
  LOGO_PALETTES,
  LogoBackground,
  LogoLayout,
  LogoSettings,
  buildLogoSvg,
  logoDataUri,
} from '@/lib/logoSvg';
import { LOGO_PRESETS, LogoPreset } from '@/lib/logoPresets';

const inputClass =
  'w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500';
const labelClass = 'block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2';

const LAYOUTS: { value: LogoLayout; label: string }[] = [
  { value: 'side', label: 'Side by side' },
  { value: 'stacked', label: 'Stacked' },
  { value: 'wordmark', label: 'Name only' },
];

const BACKGROUNDS: { value: LogoBackground; label: string }[] = [
  { value: 'light', label: 'White' },
  { value: 'dark', label: 'Dark' },
  { value: 'transparent', label: 'Transparent' },
  { value: 'custom', label: 'Custom' },
];

type ChatMessage = { role: 'user' | 'assistant'; text: string };

// Loads every logo font once, so the preview shows the real typefaces.
const loadLogoFonts = () => {
  if (document.getElementById('logo-fonts')) return;
  const link = document.createElement('link');
  link.id = 'logo-fonts';
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${LOGO_FONTS.map((font) => `family=${font.google}`).join('&')}&display=swap`;
  document.head.appendChild(link);
};

export default function LogoBuilderPage() {
  const [settings, setSettings] = useState<LogoSettings>({ ...DEFAULT_LOGO });
  const [presetId, setPresetId] = useState(LOGO_PRESETS[0].id);

  useEffect(() => {
    loadLogoFonts();
  }, []);

  const [description, setDescription] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  // The saved build on the server. Changes build on it, so the AI remembers earlier requests.
  const [buildId, setBuildId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEnd = useRef<HTMLDivElement>(null);

  const svg = useMemo(() => buildLogoSvg(settings), [settings]);
  const set = (patch: Partial<LogoSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const preset = LOGO_PRESETS.find((item) => item.id === presetId) || LOGO_PRESETS[0];
  const businessName = settings.name.trim();

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  // Asks the AI to design the logo from the description, or to answer or change it. The business name always
  // comes from the user, and the server keeps it.
  const askAi = async (mode: 'create' | 'change', text: string) => {
    setDrafting(true);
    setDraftError('');
    try {
      const response = await apiFetch('/api/logo/generate', {
        method: 'POST',
        json:
          mode === 'create'
            ? { name: businessName, description: text }
            : { name: businessName, current: settings, instruction: text, buildId },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create the logo');
      setSettings({ ...DEFAULT_LOGO, ...data.logo, name: businessName });
      setBuildId(data.buildId || null);
      setHasDraft(true);
      setMessages((current) => [...current, { role: 'assistant', text: data.reply || 'Here is your logo.' }]);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Could not create the logo');
    } finally {
      setDrafting(false);
    }
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text || drafting) return;
    setChatInput('');
    setMessages((current) => [...current, { role: 'user', text }]);
    askAi('change', text);
  };

  // Applies a style preset. The business name and tagline stay as they are.
  const applyPreset = (item: LogoPreset) => {
    set({
      icon: item.icon,
      shapes: [],
      layout: item.layout,
      font: item.font,
      primary: item.primary,
      accent: item.accent,
      background: item.background,
      uppercase: item.uppercase,
    });
  };

  const download = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(settings.name || 'logo').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-logo.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-white/[0.06] px-4 md:px-8 py-4">
          <h1 className="text-base font-semibold text-white tracking-tight">Logo Builder</h1>
          <p className="text-gray-500 text-xs mt-0.5">Design a logo in minutes. Every plan can use it, and it's free to change.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-96 shrink-0 space-y-6">
              {!hasDraft ? (
                <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 space-y-3">
                  <label className={labelClass}>Business name</label>
                  <input className={inputClass} value={settings.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Principle Engineering" />
                  <label className={labelClass}>Describe your business</label>
                  <textarea
                    className={`${inputClass} w-full resize-none h-24`}
                    value={description}
                    maxLength={600}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. A friendly pottery studio for beginners in a village, warm and hands-on"
                  />
                  <button
                    type="button"
                    onClick={() => askAi('create', description.trim())}
                    disabled={drafting || !businessName || description.trim().length < 5}
                    className="w-full bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40"
                  >
                    {drafting ? 'Designing your logo...' : 'Design my logo'}
                  </button>
                  {draftError && <p className="text-sm text-red-400">{draftError}</p>}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Chat about your logo</label>
                    <button
                      type="button"
                      onClick={() => {
                        setHasDraft(false);
                        setDescription('');
                        setBuildId(null);
                        setMessages([]);
                        setSettings((current) => ({ ...DEFAULT_LOGO, name: current.name }));
                      }}
                      className="text-xs text-gray-400 hover:text-gray-200"
                    >
                      Start again
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                    {messages.map((message, index) => (
                      <div key={index} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                        <p
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                            message.role === 'user' ? 'bg-white text-black' : 'bg-white/[0.06] text-gray-200'
                          }`}
                        >
                          {message.text}
                        </p>
                      </div>
                    ))}
                    {drafting && <p className="text-xs text-gray-500">Thinking...</p>}
                    <div ref={chatEnd} />
                  </div>
                  <div className="flex gap-2">
                    <input
                      className={`${inputClass} flex-1`}
                      value={chatInput}
                      maxLength={400}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') sendChat();
                      }}
                      placeholder="e.g. make the icon simpler, or what colours suit a plumber?"
                    />
                    <button
                      type="button"
                      onClick={sendChat}
                      disabled={drafting || !chatInput.trim()}
                      className="bg-white hover:bg-gray-200 text-black px-4 rounded-xl text-sm font-medium transition disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                  {draftError && <p className="text-sm text-red-400">{draftError}</p>}
                  <p className="text-xs text-gray-500">The business name stays as you typed it. Ask for ideas, or for changes to the logo.</p>
                </div>
              )}

              <div>
                <label className={labelClass}>Tagline (optional)</label>
                <input className={inputClass} value={settings.tagline} maxLength={80} onChange={(e) => set({ tagline: e.target.value })} placeholder="e.g. Storage made simple" />
              </div>

              <div>
                <label className={labelClass}>Style presets</label>
                <select className={inputClass} value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                  {LOGO_PRESETS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <div className="mt-3 rounded-xl border border-white/10 p-4 space-y-2">
                  <p className="text-sm text-gray-200">{preset.description}</p>
                  <p className="text-xs text-gray-500">Works well for: {preset.worksFor.join(', ')}</p>
                  <button type="button" onClick={() => applyPreset(preset)} className="mt-1 border border-white/10 hover:bg-white/5 text-gray-200 px-4 py-2 rounded-xl text-sm font-medium transition">
                    Use this style
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {LOGO_ICONS.map((icon) => (
                    <button
                      key={icon.key}
                      type="button"
                      title={icon.label}
                      onClick={() => set({ icon: icon.key, shapes: [] })}
                      className={`aspect-square rounded-xl border p-2 transition ${
                        settings.icon === icon.key ? 'border-white bg-white/10' : 'border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <svg viewBox="0 0 100 100" className="w-full h-full" fill="#e5e7eb" aria-label={icon.label} dangerouslySetInnerHTML={{ __html: icon.shape }} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Layout</label>
                <div className="grid grid-cols-3 gap-2">
                  {LAYOUTS.map((layout) => (
                    <button
                      key={layout.value}
                      type="button"
                      onClick={() => set({ layout: layout.value })}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition ${
                        settings.layout === layout.value ? 'bg-white text-black border-white' : 'border-white/10 text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {layout.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Font</label>
                <select className={inputClass} value={settings.font} onChange={(e) => set({ font: e.target.value })}>
                  {LOGO_FONTS.map((font) => (
                    <option key={font.key} value={font.key}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Colours</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {LOGO_PALETTES.map((palette) => (
                    <button
                      key={palette.name}
                      type="button"
                      title={palette.name}
                      onClick={() => set({ primary: palette.primary, accent: palette.accent })}
                      className="w-9 h-9 rounded-full border border-white/15"
                      style={{ background: `linear-gradient(135deg, ${palette.primary} 50%, ${palette.accent} 50%)` }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Text</label>
                    <input type="color" value={settings.primary} onChange={(e) => set({ primary: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Icon</label>
                    <input type="color" value={settings.accent} onChange={(e) => set({ accent: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-transparent" />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Background</label>
                <div className="grid grid-cols-4 gap-2">
                  {BACKGROUNDS.map((background) => (
                    <button
                      key={background.value}
                      type="button"
                      onClick={() => set({ background: background.value })}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition ${
                        settings.background === background.value ? 'bg-white text-black border-white' : 'border-white/10 text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {background.label}
                    </button>
                  ))}
                </div>
              </div>
              {settings.background === 'custom' && (
                <div className="mt-3 flex items-center gap-3">
                  <label className={labelClass}>Background colour</label>
                  <input
                    type="color"
                    value={settings.customBackground || '#ffffff'}
                    onChange={(e) => set({ customBackground: e.target.value })}
                    className="h-9 w-14 rounded-lg bg-transparent cursor-pointer"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 text-sm text-gray-200">
                <input type="checkbox" checked={settings.uppercase} onChange={(e) => set({ uppercase: e.target.checked })} className="h-4 w-4 accent-white" />
                Capitals for the name
              </label>

              <button type="button" onClick={download} className="w-full bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition">
                Download logo (SVG)
              </button>
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div
                className="rounded-2xl border border-white/[0.08] p-6 flex items-center justify-center min-h-[420px]"
                style={{ background: settings.background === 'dark' ? '#0b0b10' : settings.background === 'light' ? '#ffffff' : settings.background === 'custom' ? settings.customBackground || '#ffffff' : 'repeating-conic-gradient(#1f2937 0% 25%, #111827 0% 50%) 50% / 24px 24px' }}
              >
                {businessName ? (
                  <img src={logoDataUri(svg)} alt={`${settings.name} logo`} className="w-full max-w-2xl h-auto" />
                ) : (
                  <p className="text-sm text-gray-500">Enter your business name to see your logo here.</p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                The download keeps your chosen font by name. It looks right in design tools that have that font installed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
