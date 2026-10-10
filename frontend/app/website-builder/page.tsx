'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

interface WebsiteInfo {
  businessName: string;
  tagline: string;
  features: string;
  callToAction: string;
}

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
      setWebsite(data.message);
      setStep('result');
    } catch (error) {
      console.error('Error generating website:', error);
      setStep('form');
    }
  };

  return (
    <div className="min-h-screen app-bg flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-5 shadow-lg backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white tracking-tight">Website Builder</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Generate professional website copy</p>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {step === 'form' && (
            <div className="max-w-2xl">
              <form onSubmit={handleGenerateWebsite} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Name</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="e.g., CloudSync"
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tagline</label>
                  <input
                    type="text"
                    name="tagline"
                    value={formData.tagline}
                    onChange={handleInputChange}
                    placeholder="e.g., Seamless Cloud Storage for Teams"
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Key Features</label>
                  <textarea
                    name="features"
                    value={formData.features}
                    onChange={handleInputChange}
                    placeholder="e.g., Real-time collaboration, End-to-end encryption, 100GB storage"
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500 resize-none h-24"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Call to Action</label>
                  <input
                    type="text"
                    name="callToAction"
                    value={formData.callToAction}
                    onChange={handleInputChange}
                    placeholder="e.g., Start Free Trial, Get Started Now"
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-3 rounded-lg transition shadow-lg hover:shadow-xl mt-6"
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
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg transition font-semibold text-sm"
                >
                  ← Create Another Website
                </button>
              </div>

              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-8">
                <div
                  className="text-gray-200 leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{
                    __html: website
                      .split('\n')
                      .map((line) => {
                        // Headers: ## text -> <h3>text</h3>
                        if (line.startsWith('##')) {
                          return `<h3 class="text-xl font-bold text-white mt-6 mb-3">${line.replace('##', '').trim()}</h3>`;
                        }
                        // Bold
                        line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
                        // Bullet points
                        if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                          return `<div class="ml-4 mb-2">• ${line.replace(/^[\s\-•]+/, '').trim()}</div>`;
                        }
                        return line ? `<p class="mb-3">${line}</p>` : '<div class="h-2"></div>';
                      })
                      .join(''),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
