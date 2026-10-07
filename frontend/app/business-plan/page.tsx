'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

interface BusinessInfo {
  businessName: string;
  industry: string;
  targetMarket: string;
  valueProposition: string;
  revenue: string;
}

export default function BusinessPlanPage() {
  const [step, setStep] = useState<'form' | 'generating' | 'result'>('form');
  const [formData, setFormData] = useState<BusinessInfo>({
    businessName: '',
    industry: '',
    targetMarket: '',
    valueProposition: '',
    revenue: '',
  });
  const [businessPlan, setBusinessPlan] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('generating');

    try {
      const prompt = `Create a comprehensive business plan for:
- Business Name: ${formData.businessName}
- Industry: ${formData.industry}
- Target Market: ${formData.targetMarket}
- Value Proposition: ${formData.valueProposition}
- Revenue Model: ${formData.revenue}

Include the following sections:
1. Executive Summary
2. Market Analysis
3. Competitive Landscape
4. Go-to-Market Strategy
5. Financial Projections
6. Risk Analysis
7. Next Steps

Format it clearly with headers and bullet points.`;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          userId: localStorage.getItem('userId') || 'anonymous',
        }),
      });

      const data = await response.json();
      setBusinessPlan(data.message);
      setStep('result');
    } catch (error) {
      console.error('Error generating plan:', error);
      setStep('form');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-gray-900 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-5 shadow-lg backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white tracking-tight">Business Plan Generator</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">AI-powered business plan creation</p>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {step === 'form' && (
            <div className="max-w-2xl">
              <form onSubmit={handleGeneratePlan} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Name</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="e.g., EcoTech Solutions"
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    placeholder="e.g., SaaS, E-commerce, Consulting"
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Target Market</label>
                  <input
                    type="text"
                    name="targetMarket"
                    value={formData.targetMarket}
                    onChange={handleInputChange}
                    placeholder="e.g., Small businesses in the US"
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Value Proposition</label>
                  <textarea
                    name="valueProposition"
                    value={formData.valueProposition}
                    onChange={handleInputChange}
                    placeholder="What problem does your business solve and how?"
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition placeholder-gray-500 resize-none h-24"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Revenue Model</label>
                  <input
                    type="text"
                    name="revenue"
                    value={formData.revenue}
                    onChange={handleInputChange}
                    placeholder="e.g., Subscription, One-time purchase, Freemium"
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition placeholder-gray-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition shadow-lg hover:shadow-xl mt-6"
                >
                  Generate Business Plan
                </button>
              </form>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-300 text-lg">Generating your business plan...</p>
            </div>
          )}

          {step === 'result' && (
            <div className="max-w-4xl">
              <div className="mb-6 flex gap-3">
                <button
                  onClick={() => {
                    setStep('form');
                    setBusinessPlan('');
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg transition font-semibold text-sm"
                >
                  ← Create Another Plan
                </button>
              </div>

              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-8">
                <div className="prose prose-invert max-w-none">
                  <div
                    className="text-gray-200 leading-relaxed space-y-4"
                    dangerouslySetInnerHTML={{
                      __html: businessPlan
                        .split('\n')
                        .map((line) => {
                          // Headers: ## text -> <h3>text</h3>
                          if (line.startsWith('##')) {
                            return `<h3 class="text-xl font-bold text-white mt-6 mb-3">${line.replace('##', '').trim()}</h3>`;
                          }
                          // Bold: **text** -> <strong>text</strong>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
