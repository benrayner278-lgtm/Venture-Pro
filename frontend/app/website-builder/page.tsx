'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { WEBSITE_THEMES, WebsiteContent, renderWebsite } from '@/lib/websiteTemplates';

type Step = 'form' | 'generating' | 'result';

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
  const [themeId, setThemeId] = useState(WEBSITE_THEMES[0].id);
  const [shuffle, setShuffle] = useState(0);
  const [tweak, setTweak] = useState('');
  const [tweaking, setTweaking] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const requestContent = async (extra: { currentContent?: WebsiteContent; instruction?: string }) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/website/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, ...extra }),
    });
    const data = await response.json();
    if (!response.ok || !data.content) {
      throw new Error(data.error || 'No content returned');
    }
    return data.content as WebsiteContent;
  };

  const handleGenerateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('generating');
    try {
      setContent(await requestContent({}));
      setStep('result');
    } catch (error) {
      console.error('Error generating website:', error);
      alert('Website generation failed. Please try again.');
      setStep('form');
    }
  };

  const handleTweak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || !tweak.trim()) return;
    setTweaking(true);
    try {
      setContent(await requestContent({ currentContent: content, instruction: tweak.trim() }));
      setTweak('');
    } catch (error) {
      console.error('Error applying change:', error);
      alert('That change could not be applied. Please try again.');
    } finally {
      setTweaking(false);
    }
  };

  const html = content ? renderWebsite(content, themeId, shuffle) : '';

  const downloadWebsite = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(content?.brand.name || 'website').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
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
            <div className="flex gap-6 h-full">
              <aside className="w-60 shrink-0 space-y-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">Style</p>
                  <div className="space-y-1.5">
                    {WEBSITE_THEMES.map((theme) => {
                      const selected = theme.id === themeId;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setThemeId(theme.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                            selected ? 'bg-white/[0.07] text-white' : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                          }`}
                        >
                          <span
                            className="w-7 h-7 rounded-full border border-white/15 shrink-0"
                            style={{ background: `linear-gradient(135deg, ${theme.bg} 50%, ${theme.accent} 50%)` }}
                          />
                          <span>
                            <span className="block text-sm font-medium">{theme.name}</span>
                            <span className="block text-xs text-gray-500">{theme.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setShuffle((n) => n + 1)}
                    className="w-full border border-white/10 hover:bg-white/5 text-gray-200 px-4 py-2.5 rounded-xl transition font-medium text-sm"
                  >
                    Shuffle layout
                  </button>
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
                    }}
                    className="w-full border border-white/10 hover:bg-white/5 text-gray-200 px-4 py-2.5 rounded-xl transition font-medium text-sm"
                  >
                    Create another
                  </button>
                </div>
              </aside>

              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] flex-1 min-h-[70vh]">
                  <iframe
                    title="Website preview"
                    srcDoc={html}
                    className="w-full h-full min-h-[70vh] bg-black"
                  />
                </div>

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
