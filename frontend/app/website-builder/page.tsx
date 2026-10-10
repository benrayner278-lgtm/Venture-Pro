'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

interface WebsiteInfo {
  businessName: string;
  tagline: string;
  features: string;
  callToAction: string;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatCopy = (text: string) =>
  escapeHtml(text)
    .split('\n')
    .map((line) => {
      if (line.startsWith('##')) {
        return `<h3 class="section-title">${line.replace('##', '').trim()}</h3>`;
      }
      const bolded = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (bolded.trim().startsWith('-') || bolded.trim().startsWith('•')) {
        return `<div class="bullet">• ${bolded.replace(/^[\s\-•]+/, '').trim()}</div>`;
      }
      return bolded.trim() ? `<p>${bolded}</p>` : '<div class="spacer"></div>';
    })
    .join('');

export default function WebsiteBuilderPage() {
  const [step, setStep] = useState<'form' | 'generating' | 'result'>('form');
  const [formData, setFormData] = useState<WebsiteInfo>({
    businessName: '',
    tagline: '',
    features: '',
    callToAction: '',
  });
  const [website, setWebsite] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('generating');

    try {
      const prompt = `Create compelling website copy for:
- Business Name: ${formData.businessName}
- Tagline: ${formData.tagline}
- Key Features: ${formData.features}
- Call to Action: ${formData.callToAction}

Include the following sections:
1. Hero Section (headline, subheadline)
2. Problem Statement
3. Solution Overview
4. Key Features
5. Benefits
6. Pricing Section (basic structure)
7. FAQ Section
8. Final CTA

Write it as engaging, conversion-focused copy. Format with clear section headers.`;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          userId: localStorage.getItem('userId') || 'anonymous',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.message) {
        throw new Error(data.error || 'No content returned');
      }
      setWebsite(data.message);
      setStep('result');
    } catch (error) {
      console.error('Error generating website:', error);
      alert('Website generation failed. Please try again.');
      setStep('form');
    }
  };

  const downloadWebsite = () => {
    const title = escapeHtml(formData.businessName || 'Website');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{margin:0;background:#000;color:#d1d5db;font-family:Inter,Arial,sans-serif;line-height:1.7}main{max-width:760px;margin:0 auto;padding:64px 24px}p{margin:0 0 12px}strong{color:#fff;font-weight:600}.section-title{font-size:22px;font-weight:700;color:#fff;margin:32px 0 12px}.bullet{margin-left:16px;margin-bottom:8px}.spacer{height:8px}</style></head><body><main>${formatCopy(website)}</main></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(formData.businessName || 'website').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen app-bg flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-white/[0.06] px-8 py-4">
          <h1 className="text-base font-semibold text-white tracking-tight">Website Builder</h1>
          <p className="text-gray-500 text-xs mt-0.5">Generate professional website copy</p>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
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
              <p className="text-gray-300 text-lg">Generating website copy...</p>
            </div>
          )}

          {step === 'result' && (
            <div className="max-w-4xl">
              <div className="mb-6 flex gap-3">
                <button
                  onClick={() => {
                    setStep('form');
                    setWebsite('');
                  }}
                  className="border border-white/10 hover:bg-white/5 text-gray-200 px-5 py-2.5 rounded-xl transition font-medium text-sm"
                >
                  ← Create Another Website
                </button>
                <button
                  onClick={downloadWebsite}
                  className="bg-white hover:bg-gray-200 text-black px-5 py-2.5 rounded-xl transition font-medium text-sm"
                >
                  Download HTML
                </button>
              </div>

              <div className="border border-white/[0.06] bg-white/[0.02] rounded-2xl p-8">
                <div
                  className="copy-output text-gray-300 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatCopy(website) }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
