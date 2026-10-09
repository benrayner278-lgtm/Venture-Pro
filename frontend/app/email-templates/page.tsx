'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

const EMAIL_TEMPLATES = [
  {
    id: 1,
    name: 'Welcome Email',
    subject: 'Welcome to [Company Name]!',
    preview: 'Set a great first impression with new customers',
    body: `Hi [Customer Name],

Welcome to [Company Name]! We're thrilled to have you on board.

Over the next few days, we'll be sending you some resources to help you get the most out of [Product Name]:
- Getting started guide
- Best practices
- Exclusive introductory offer

In the meantime, feel free to reach out if you have any questions.

Best regards,
The [Company Name] Team`,
  },
  {
    id: 2,
    name: 'Launch Announcement',
    subject: '🚀 We\'ve Launched Something New!',
    preview: 'Announce a new product or feature',
    body: `Hi [Customer Name],

We're excited to announce the launch of [New Product/Feature]!

What's new:
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

This solves the problem of [Problem] and will help you [Desired Outcome].

[Call to Action: Try it now / Learn more]

Thanks for being part of our journey!

The [Company Name] Team`,
  },
  {
    id: 3,
    name: 'Feedback Request',
    subject: 'Quick question about your experience',
    preview: 'Ask customers for valuable feedback',
    body: `Hi [Customer Name],

We'd love to hear your thoughts on [Product/Service]!

Your feedback helps us improve and build features that matter most to you.

Would you be willing to answer a few quick questions? It should only take 5 minutes.

[Call to Action: Share your feedback]

As a thank you, everyone who responds gets [Incentive].

Thanks for your support!

[Company Name]`,
  },
  {
    id: 4,
    name: 'Re-engagement',
    subject: 'We miss you! Here\'s what\'s new',
    preview: 'Win back inactive customers',
    body: `Hi [Customer Name],

It's been a while, and we'd love to have you back!

Since you last visited, we've launched:
- [New Feature 1]
- [New Feature 2]
- [New Feature 3]

Plus, we're running a special [X% off / Free trial] offer this month.

[Call to Action: Come back and explore]

Let us know if you have any questions or need help getting started again.

Best regards,
The [Company Name] Team`,
  },
  {
    id: 5,
    name: 'Newsletter',
    subject: '[Company Name] Monthly Newsletter - [Month]',
    preview: 'Keep customers engaged with regular updates',
    body: `Hi [Customer Name],

Here's what's been happening at [Company Name] this month:

📰 Latest News:
- [Article/News 1]
- [Article/News 2]

💡 Tip of the Month:
[Actionable tip related to your industry]

🎉 Upcoming Event:
[Event/Webinar/Sale] - [Date]
[Call to Action: Register / Learn more]

📚 Resources:
- [Blog post / Guide / Case study]

Until next month!

The [Company Name] Team`,
  },
];

interface SelectedTemplate {
  id: number;
  body: string;
}

export default function EmailTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(null);
  const [customBody, setCustomBody] = useState('');

  const handleSelectTemplate = (template: (typeof EMAIL_TEMPLATES)[0]) => {
    setSelectedTemplate({ id: template.id, body: template.body });
    setCustomBody(template.body);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(customBody);
    alert('Template copied to clipboard!');
  };

  return (
    <div className="min-h-screen app-bg flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-5 shadow-lg backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white tracking-tight">Email Templates</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Ready-to-use email templates</p>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Templates List */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-bold text-white mb-4">Templates</h2>
              <div className="space-y-3">
                {EMAIL_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`w-full text-left p-4 rounded-lg transition border ${
                      selectedTemplate?.id === template.id
                        ? 'bg-blue-600/20 border-blue-500/30'
                        : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800'
                    }`}
                  >
                    <h3 className="font-semibold text-white">{template.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">{template.preview}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Editor */}
            <div className="lg:col-span-2">
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Template</label>
                    <textarea
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      className="w-full h-96 px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition placeholder-gray-500 font-mono text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-semibold text-sm"
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition font-semibold text-sm"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-2">💡 Tip: Replace [brackets] with your actual content</p>
                    <p className="text-xs text-gray-500">
                      Common placeholders: [Customer Name], [Company Name], [Product Name], [Date], [Offer], etc.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 bg-gray-900/50 border border-gray-800/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-gray-400 text-lg">Select a template to edit</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
