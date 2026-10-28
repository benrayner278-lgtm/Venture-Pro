'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { PORTFOLIO_PLANS, WEBSITE_PRESETS, WebsiteContent, WebsiteSection, randomLayoutSeed } from '@/lib/websiteTemplates';
import { apiFetch } from '@/lib/api';
import PublishPanel from '@/components/PublishPanel';
import { ContactEditor, PortfolioEditor } from '@/components/SiteDetailsEditor';
import { PagePhotos } from '@/components/PagePhotos';
import StyleEditor from '@/components/StyleEditor';
import TextEditPanel from '@/components/TextEditPanel';
import { ContentPath, describePath, getAt, setAt } from '@/lib/contentPath';

type Step = 'form' | 'generating' | 'result';
type View = 'preview' | 'style' | 'contact' | 'portfolio';

export default function WebsiteBuilderPage() {
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState({
    businessName: '',
    tagline: '',
    features: '',
    callToAction: '',
    requests: '',
  });
  const [content, setContent] = useState<WebsiteContent | null>(null);
  const [themeId, setThemeId] = useState(WEBSITE_PRESETS[0].id);
  const [shuffle, setShuffle] = useState(0);
  const [tweak, setTweak] = useState('');
  const [tweaking, setTweaking] = useState(false);
  // The saved build on the server. Changes build on it, so the AI remembers earlier requests.
  const [buildId, setBuildId] = useState<string | null>(null);
  const [tweakReply, setTweakReply] = useState('');
  const [plan, setPlan] = useState('free');
  const portfolioAllowed = PORTFOLIO_PLANS.includes(plan);

  useEffect(() => {
    apiFetch('/api/billing/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.plan) setPlan(data.plan);
      })
      .catch(() => {});
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const requestContent = async (extra: { currentContent?: WebsiteContent; instruction?: string; buildId?: string }) => {
    const response = await apiFetch('/api/website/generate', {
      method: 'POST',
      json: { ...formData, ...extra },
    });
    const data = await response.json();
    if (!response.ok || !data.content) {
      throw new Error(data.error || 'No content returned');
    }
    return { content: data.content as WebsiteContent, buildId: (data.buildId as string) || null, reply: (data.reply as string) || '' };
  };

  const handleGenerateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('generating');
    try {
      const result = await requestContent({});
      setContent(result.content);
      setBuildId(result.buildId);
      setTweakReply(result.reply);
      setShuffle(randomLayoutSeed());
      setStep('result');
    } catch (error) {
      console.error('Error generating website:', error);
      alert('Website generation failed. Please try again.');
      setStep('form');
    }
  };

  // Sends one change to the AI. The photos the owner added are sent with the site, so the AI can place them.
  const runChange = async (instruction: string) => {
    if (!content || !instruction.trim()) return;
    setEditingPath(null);
    setTweaking(true);
    try {
      // Contact details and photos are kept by the builder, so they are not sent to the AI.
      const { contact, portfolio, style, ...siteOnly } = content;
      const result = await requestContent({ currentContent: siteOnly, instruction: instruction.trim(), buildId: buildId || undefined });
      setBuildId(result.buildId);
      setTweakReply(result.reply);
      if (JSON.stringify(result.content) === JSON.stringify(siteOnly)) {
        alert('The AI did not change anything. Try describing the change more specifically.');
        return;
      }
      setContent({ ...result.content, contact, portfolio, style });
      setTweak('');
    } catch (error) {
      console.error('Error applying change:', error);
      alert('That change could not be applied. Please try again.');
    } finally {
      setTweaking(false);
    }
  };

  const handleTweak = (e: React.FormEvent) => {
    e.preventDefault();
    return runChange(tweak);
  };

  const [view, setView] = useState<View>('preview');
  const [previewContent, setPreviewContent] = useState<WebsiteContent | null>(null);
  const [html, setHtml] = useState('');
  const [previewError, setPreviewError] = useState('');
  // Maps each clickable piece of text in the preview to its place in the content.
  const [editPaths, setEditPaths] = useState<Record<string, ContentPath>>({});
  const [editingPath, setEditingPath] = useState<ContentPath | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Wait for a pause in editing before asking the server for a new preview.
  useEffect(() => {
    const timer = setTimeout(() => setPreviewContent(content), 400);
    return () => clearTimeout(timer);
  }, [content]);

  // The preview sends a message when its text is double-clicked. Only the preview frame is trusted.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type !== 'edit-text') return;
      const path = editPaths[event.data.id];
      if (path) setEditingPath(path);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [editPaths]);

  const saveEdit = (text: string) => {
    if (!content || !editingPath) return;
    setContent(setAt(content, editingPath, text));
    setEditingPath(null);
  };

  const openPortfolio = () => {
    if (!content) return;
    if (portfolioAllowed && !content.portfolio) {
      const gallery = (content.sections ?? []).find((s): s is Extract<WebsiteSection, { type: 'gallery' }> => s.type === 'gallery');
      setContent({ ...content, portfolio: { title: gallery?.title || 'Our work', items: gallery?.items || [] } });
    }
    setView('portfolio');
  };

  useEffect(() => {
    if (!previewContent) return;
    let cancelled = false;
    apiFetch('/api/sites/preview', { method: 'POST', json: { content: previewContent, themeId, shuffle, editable: true } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Preview failed');
        if (!cancelled) {
          setHtml(data.html);
          setEditPaths(data.paths || {});
          setPreviewError('');
        }
      })
      .catch((error) => {
        if (!cancelled) setPreviewError(error instanceof Error ? error.message : 'Preview failed');
      });
    return () => {
      cancelled = true;
    };
  }, [previewContent, themeId, shuffle]);

  const downloadWebsite = async () => {
    if (!content) return;
    // The download is the plain page, without the editing markup the preview uses. Free accounts are refused here.
    const response = await apiFetch('/api/sites/download', { method: 'POST', json: { content, themeId, shuffle } });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'Could not download the website');
      return;
    }
    const url = URL.createObjectURL(new Blob([data.html], { type: 'text/html' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(content.brand.name || 'website').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen app-bg flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-white/[0.06] px-8 py-4">
          <h1 className="text-base font-semibold text-white tracking-tight">Website Builder</h1>
          <p className="text-gray-500 text-xs mt-0.5">Generate a complete website for your business</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 'form' && (
            <div className="max-w-2xl">
              <form onSubmit={handleGenerateWebsite} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Business Name</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="e.g., CloudSync"
                    className="w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Tagline</label>
                  <input
                    type="text"
                    name="tagline"
                    value={formData.tagline}
                    onChange={handleInputChange}
                    placeholder="e.g., Seamless Cloud Storage for Teams"
                    className="w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Key Features</label>
                  <textarea
                    name="features"
                    value={formData.features}
                    onChange={handleInputChange}
                    placeholder="e.g., Real-time collaboration, End-to-end encryption, 100GB storage"
                    className="w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500 resize-none h-24"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Call to Action</label>
                  <input
                    type="text"
                    name="callToAction"
                    value={formData.callToAction}
                    onChange={handleInputChange}
                    placeholder="e.g., Start Free Trial, Get Started Now"
                    className="w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Anything specific? (optional)</label>
                  <textarea
                    name="requests"
                    value={formData.requests}
                    onChange={handleInputChange}
                    placeholder="e.g., Add a section to show our work, include a contact email hello@example.com"
                    className="w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500 resize-none h-24"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-white hover:bg-gray-200 text-black font-medium text-sm py-3 rounded-xl transition mt-6"
                >
                  Generate Website
                </button>
              </form>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white/40 mb-4"></div>
              <p className="text-gray-300 text-lg">Building your website...</p>
            </div>
          )}

          {step === 'result' && content && (
            <div className="flex flex-col lg:flex-row gap-6">
              <aside className="w-full lg:w-96 shrink-0 space-y-6">
                {content.format !== 'page' && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">Style</label>
                  <select
                    value={content.design?.palette ? 'brief' : themeId}
                    onChange={(e) => {
                      if (e.target.value === 'brief') return;
                      // Picking a preset replaces the colours and fonts the AI chose for this business.
                      setThemeId(e.target.value);
                      setContent({ ...content, design: { ...content.design, palette: undefined, fonts: undefined } });
                    }}
                    className="w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition"
                  >
                    {content.design?.palette && <option value="brief">Designed for your business</option>}
                    {WEBSITE_PRESETS.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}: {theme.description}
                      </option>
                    ))}
                  </select>
                </div>
                )}

                {content.format !== 'page' && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">Edit your site</p>
                  <div className="space-y-1.5">
                    {(
                      [
                        { id: 'style', label: 'Edit style and fonts' },
                        { id: 'contact', label: 'Edit contact details' },
                        { id: 'portfolio', label: portfolioAllowed ? 'Edit portfolio and photos' : 'Edit portfolio and photos (Premium)' },
                      ] as { id: View; label: string }[]
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setEditingPath(null);
                          if (view === tab.id) return setView('preview');
                          if (tab.id === 'portfolio') return openPortfolio();
                          setView(tab.id);
                        }}
                        className={`w-full px-4 py-2.5 rounded-lg text-left text-sm transition ${
                          view === tab.id ? 'bg-white text-black font-medium' : 'border border-white/10 text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {editingPath && (
                  <TextEditPanel
                    key={editingPath.join('.')}
                    label={describePath(content, editingPath)}
                    initialText={String(getAt(content, editingPath) ?? '')}
                    multiline={editingPath.includes('paragraphs') || editingPath.includes('description')}
                    onSave={saveEdit}
                    onCancel={() => setEditingPath(null)}
                  />
                )}
                {!editingPath && view === 'preview' && content.format !== 'page' && (
                  <p className="text-xs text-gray-500">Double-click any text in the preview to edit it.</p>
                )}
                {!editingPath && view === 'style' && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <StyleEditor value={content.style || {}} onChange={(style) => setContent({ ...content, style })} />
                  </div>
                )}
                {!editingPath && view === 'contact' && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <ContactEditor value={content.contact || {}} onChange={(contact) => setContent({ ...content, contact })} />
                  </div>
                )}
                {!editingPath && view === 'portfolio' && !portfolioAllowed && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
                    <p className="text-sm font-medium text-white">The portfolio maker is included in Premium and above.</p>
                    <p className="text-xs text-gray-400">Upgrade to add your own project pages and photos. Your site keeps its existing gallery.</p>
                    <Link href="/billing" className="inline-block bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition">
                      See plans
                    </Link>
                  </div>
                )}
                {!editingPath && view === 'portfolio' && portfolioAllowed && content.portfolio && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <PortfolioEditor value={content.portfolio} onChange={(portfolio) => setContent({ ...content, portfolio })} />
                  </div>
                )}

                <div className="space-y-2">
                  {content.format !== 'page' && (
                  <button
                    onClick={() => setShuffle(randomLayoutSeed())}
                    className="w-full border border-white/10 hover:bg-white/5 text-gray-200 px-4 py-2.5 rounded-xl transition font-medium text-sm"
                  >
                    Shuffle layout
                  </button>
                  )}
                  <button
                    onClick={downloadWebsite}
                    className="w-full bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl transition font-medium text-sm"
                  >
                    Download HTML
                  </button>
                  <button
                    onClick={() => {
                      setStep('form');
                      setContent(null);
                      setBuildId(null);
                      setTweakReply('');
                    }}
                    className="w-full border border-white/10 hover:bg-white/5 text-gray-200 px-4 py-2.5 rounded-xl transition font-medium text-sm"
                  >
                    Create another
                  </button>
                </div>

                <PublishPanel content={content} themeId={themeId} shuffle={shuffle} onShuffleChange={setShuffle} />
              </aside>

              <div className="flex-1 min-w-0 flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
                <div className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3">
                  <p className="text-sm font-medium text-white">You can change all of this at any time.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    The preview stays here while you edit. To update your published site, click Update live site in the Publish panel.
                  </p>
                </div>

                {previewError && <p className="text-sm text-red-400">{previewError}</p>}

                {/* Scripts are allowed only so double-clicks can be reported. Without same-origin access, the preview cannot reach this page. */}
                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] h-[60vh] lg:h-[calc(100vh-15rem)] min-h-[480px]">
                  <iframe
                    ref={frameRef}
                    title="Website preview"
                    srcDoc={html}
                    sandbox="allow-scripts"
                    className="w-full h-full bg-black"
                  />
                </div>

                {content?.format === 'page' && (
                  <PagePhotos
                    images={content.images || {}}
                    onChange={(images) => setContent((current) => (current ? { ...current, images } : current))}
                    onPlace={() => runChange('Place my uploaded photos where they fit best, replacing the stock picture placeholders.')}
                    disabled={tweaking}
                  />
                )}
                {tweakReply && <p className="text-sm text-gray-300 mb-2">{tweakReply}</p>}
                <form onSubmit={handleTweak} className="relative">
                  <input
                    type="text"
                    value={tweak}
                    onChange={(e) => setTweak(e.target.value)}
                    placeholder="Ask for a change, e.g. make the headline shorter"
                    disabled={tweaking}
                    className="w-full bg-white/[0.04] text-gray-100 pl-4 pr-24 py-3 rounded-xl border border-white/10 focus:border-white/25 outline-none placeholder-gray-600 transition text-sm disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={tweaking || !tweak.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-lg bg-white text-black text-sm font-medium transition hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {tweaking ? 'Applying...' : 'Apply'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
