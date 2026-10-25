'use client';

import { useEffect, useMemo, useState } from 'react';
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
];

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

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
  const [settings, setSettings] = useState<LogoSettings>({ ...DEFAULT_LOGO, name: 'Your Business' });

  useEffect(() => {
    loadLogoFonts();
  }, []);

  const [description, setDescription] = useState('');
  const [instruction, setInstruction] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  // The saved build on the server. Changes build on it, so the AI remembers earlier requests.
  const [buildId, setBuildId] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const svg = useMemo(() => buildLogoSvg(settings), [settings]);
  const set = (patch: Partial<LogoSettings>) => setSettings((current) => ({ ...current, ...patch }));

  // Asks the AI to design a logo from a description, or to change the current one.
  const askAi = async (mode: 'create' | 'change') => {
    setDrafting(true);
    setDraftError('');
    setReply('');
    try {
      const response = await apiFetch('/api/logo/generate', {
        method: 'POST',
        json: mode === 'create' ? { description } : { current: settings, instruction, buildId },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create the logo');
      setSettings({ ...DEFAULT_LOGO, ...data.logo });
      setBuildId(data.buildId || null);
      setReply(data.reply || '');
      setHasDraft(true);
      if (mode === 'change') setInstruction('');
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Could not create the logo');
    } finally {
      setDrafting(false);
    }
  };

  // Gives a new combination to start from. The user keeps any name or tagline they typed.
  const shuffle = () => {
    const palette = pick(LOGO_PALETTES);
    set({
      icon: pick(LOGO_ICONS).key,
      layout: pick(LAYOUTS).value,
      font: pick(LOGO_FONTS).key,
      primary: palette.primary,
      accent: palette.accent,
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
    <div className="min-h-screen app-bg flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-white/[0.06] px-8 py-4">
          <h1 className="text-base font-semibold text-white tracking-tight">Logo Builder</h1>
          <p className="text-gray-500 text-xs mt-0.5">Design a logo in minutes. Every plan can use it, and it's free to change.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-96 shrink-0 space-y-6">
              <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 space-y-3">
                {!hasDraft ? (
                  <>
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
                      onClick={() => askAi('create')}
                      disabled={drafting || description.trim().length < 5}
                      className="w-full bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40"
                    >
                      {drafting ? 'Designing your logo...' : 'Design my logo'}
                    </button>
                  </>
                ) : (
                  <>
                    <label className={labelClass}>Ask for a change</label>
                    <input
                      className={`${inputClass} w-full`}
                      value={instruction}
                      maxLength={400}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="e.g. make the icon simpler and use a softer green"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => askAi('change')}
                        disabled={drafting || !instruction.trim()}
                        className="flex-1 bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40"
                      >
                        {drafting ? 'Updating...' : 'Apply change'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHasDraft(false);
                          setDescription('');
                          setBuildId(null);
                          setReply('');
                        }}
                        className="border border-white/10 hover:bg-white/5 text-gray-300 px-4 py-2.5 rounded-xl text-sm"
                      >
                        Start again
                      </button>
                    </div>
                  </>
                )}
                {draftError && <p className="text-sm text-red-400">{draftError}</p>}
                {reply && <p className="text-sm text-gray-300">{reply}</p>}
                <p className="text-xs text-gray-500">The fine-tuning controls below change anything the AI made.</p>
              </div>

              <div>
                <label className={labelClass}>Business name</label>
                <input className={inputClass} value={settings.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. CloudSync" />
              </div>
              <div>
                <label className={labelClass}>Tagline (optional)</label>
                <input className={inputClass} value={settings.tagline} maxLength={80} onChange={(e) => set({ tagline: e.target.value })} placeholder="e.g. Storage made simple" />
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
                <div className="grid grid-cols-3 gap-2">
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

              <label className="flex items-center gap-3 text-sm text-gray-200">
                <input type="checkbox" checked={settings.uppercase} onChange={(e) => set({ uppercase: e.target.checked })} className="h-4 w-4 accent-white" />
                Capitals for the name
              </label>

              <div className="space-y-2">
                <button type="button" onClick={shuffle} className="w-full border border-white/10 hover:bg-white/5 text-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition">
                  Shuffle ideas
                </button>
                <button type="button" onClick={download} className="w-full bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition">
                  Download logo (SVG)
                </button>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div
                className="rounded-2xl border border-white/[0.08] p-6 flex items-center justify-center min-h-[420px]"
                style={{ background: settings.background === 'dark' ? '#0b0b10' : settings.background === 'light' ? '#ffffff' : 'repeating-conic-gradient(#1f2937 0% 25%, #111827 0% 50%) 50% / 24px 24px' }}
              >
                <img src={logoDataUri(svg)} alt={`${settings.name || 'Your'} logo`} className="w-full max-w-2xl h-auto" />
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
