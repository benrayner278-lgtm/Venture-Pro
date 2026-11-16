'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import AssistantChat from '@/components/AssistantChat';
import { DEFAULT_LOGO, LOGO_FONTS, LogoSettings, buildLogoSvg, logoDataUri } from '@/lib/logoSvg';

const inputClass =
  'w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500';
const labelClass = 'block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2';

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
  // The logo's look is changed through the assistant. The form only holds the business name and tagline.
  const [settings, setSettings] = useState<LogoSettings>({ ...DEFAULT_LOGO });

  useEffect(() => {
    loadLogoFonts();
  }, []);

  const [description, setDescription] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  // The saved build on the server. Changes build on it, so the assistant remembers earlier requests.
  const [buildId, setBuildId] = useState<string | null>(null);
  // The user's websites, so the logo can be put on one of them.
  const [sites, setSites] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [siteId, setSiteId] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [attachMessage, setAttachMessage] = useState('');
  // The logo is saved to the server as the user works, so leaving the page does not lose it.
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const latest = useRef({ settings: DEFAULT_LOGO as LogoSettings, buildId: null as string | null, loaded: false });

  // Picks up the user's latest logo, so a reload, a return to the page, or a change made by the assistant shows it.
  const loadDraft = () =>
    apiFetch('/api/logo/draft')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data?.logo) return;
        setSettings({ ...DEFAULT_LOGO, ...data.logo });
        setBuildId(data.buildId || null);
        setHasDraft(true);
      })
      .catch(() => {});

  useEffect(() => {
    loadDraft().finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saves the logo. With keepalive the request still goes out while the page is closing.
  const saveDraft = (draft: LogoSettings, id: string | null, keepalive = false) => {
    if (!keepalive) setSaveStatus('saving');
    return apiFetch('/api/logo/draft', { method: 'PUT', json: { buildId: id ?? undefined, logo: draft }, keepalive })
      .then(async (response) => {
        if (!response.ok) throw new Error('save failed');
        const data = await response.json();
        if (data.buildId && data.buildId !== latest.current.buildId) {
          latest.current.buildId = data.buildId;
          setBuildId(data.buildId);
        }
        if (!keepalive) setSaveStatus('saved');
      })
      .catch(() => {
        if (!keepalive) setSaveStatus('error');
      });
  };

  useEffect(() => {
    latest.current = { settings, buildId, loaded };
  });

  // Saves a moment after the last change.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => saveDraft(settings, buildId), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, loaded]);

  // Saves straight away when the tab is hidden or closed.
  useEffect(() => {
    const flush = () => {
      const { settings: current, buildId: id, loaded: ready } = latest.current;
      if (ready) saveDraft(current, id, true);
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiFetch('/api/sites')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data?.sites) return;
        setSites(data.sites);
        if (data.sites[0]) setSiteId(data.sites[0].id);
      })
      .catch(() => {});
  }, []);

  // Saves the logo to the chosen site. The site keeps its design and content; only its logo changes.
  const useOnSite = async () => {
    setAttaching(true);
    setAttachMessage('');
    try {
      const response = await apiFetch(`/api/sites/${siteId}/logo`, { method: 'PUT', json: { logo: { ...settings, name: businessName } } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save the logo');
      setAttachMessage(
        data.headerLogo === false
          ? 'Saved. The logo is now the browser tab icon for that site. Custom layout sites have no header logo.'
          : 'Saved. The logo now shows top left on that site, and as the browser tab icon.',
      );
    } catch (err) {
      setAttachMessage(err instanceof Error ? err.message : 'Could not save the logo');
    } finally {
      setAttaching(false);
    }
  };

  const svg = useMemo(() => buildLogoSvg(settings), [settings]);
  const set = (patch: Partial<LogoSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const businessName = settings.name.trim();

  // Designs the first logo from the description. The business name always comes from the user, and the server keeps it.
  // Changes after that are asked for in the assistant, which shares its memory with the other pages.
  const createLogo = async () => {
    setDrafting(true);
    setDraftError('');
    try {
      const response = await apiFetch('/api/logo/generate', { method: 'POST', json: { name: businessName, description: description.trim() } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create the logo');
      setSettings({ ...DEFAULT_LOGO, ...data.logo, name: businessName });
      setBuildId(data.buildId || null);
      setHasDraft(true);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Could not create the logo');
    } finally {
      setDrafting(false);
    }
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
                    onClick={createLogo}
                    disabled={drafting || !businessName || description.trim().length < 5}
                    className="w-full bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40"
                  >
                    {drafting ? 'Designing your logo...' : 'Design my logo'}
                  </button>
                  {draftError && <p className="text-sm text-red-400">{draftError}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Chat about your logo</label>
                    <button
                      type="button"
                      onClick={() => {
                        setHasDraft(false);
                        setDescription('');
                        setBuildId(null);
                        setSettings((current) => ({ ...DEFAULT_LOGO, name: current.name }));
                      }}
                      className="text-xs text-gray-400 hover:text-gray-200"
                    >
                      Start again
                    </button>
                  </div>
                  {/* The same assistant as Chat and the Website Builder. It can change this logo, and the business name stays as typed. */}
                  <div className="h-[480px] overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04]">
                    <AssistantChat
                      compact
                      context="Logo Builder"
                      hint='Ask for ideas or changes, such as "make the icon simpler" or "what colours suit a plumber?"'
                      onTurnComplete={({ logoChanged }) => {
                        if (logoChanged) loadDraft();
                      }}
                    />
                  </div>
                  {draftError && <p className="text-sm text-red-400">{draftError}</p>}
                </div>
              )}

              <div>
                <label className={labelClass}>Tagline (optional)</label>
                <input className={inputClass} value={settings.tagline} maxLength={80} onChange={(e) => set({ tagline: e.target.value })} placeholder="e.g. Storage made simple" />
              </div>

              <button type="button" onClick={download} className="w-full bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition">
                Download logo (SVG)
              </button>

              <div className="border-t border-white/10 pt-4 space-y-2">
                <p className="text-sm text-gray-200 font-medium">Show on my website</p>
                {sites.length === 0 ? (
                  <p className="text-xs text-gray-500">Build a website first, then it will appear here. The logo shows top left in the site header and as the browser tab icon.</p>
                ) : (
                  <>
                    <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full bg-white/5 border border-white/10 text-gray-200 rounded-xl px-3 py-2 text-sm">
                      {sites.map((site) => (
                        <option key={site.id} value={site.id} className="bg-black">
                          {site.title || site.slug}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={useOnSite} disabled={!businessName || !siteId || attaching} className="w-full border border-white/10 hover:bg-white/5 disabled:opacity-40 text-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition">
                      {attaching ? 'Saving...' : 'Use this logo on the site'}
                    </button>
                  </>
                )}
                {attachMessage && <p className="text-xs text-gray-400">{attachMessage}</p>}
              </div>
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
              <p className="text-xs text-gray-500" aria-live="polite">
                {saveStatus === 'saving' ? 'Saving your logo...' : saveStatus === 'saved' ? 'Your logo is saved.' : saveStatus === 'error' ? 'Could not save your logo. Your changes will try again on your next edit.' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
