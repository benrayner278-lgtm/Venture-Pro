'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

const LEGAL_TEMPLATES = [
  {
    id: 1,
    name: 'Terms of Service',
    description: 'Standard terms governing use of your product/service',
    body: `TERMS OF SERVICE

Last Updated: [DATE]

1. ACCEPTANCE OF TERMS
By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.

2. USE LICENSE
Permission is granted to temporarily download one copy of the materials for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
- Modifying or copying the materials
- Using the materials for any commercial purpose or for any public display
- Attempting to decompile or reverse engineer any software contained on the site
- Removing any copyright or other proprietary notations from the materials

3. DISCLAIMER
The materials on our website are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.

4. LIMITATIONS
In no event shall our company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the website.

5. ACCURACY OF MATERIALS
The materials appearing on our website could include technical, typographical, or photographic errors. Our company does not warrant that any of the materials on the website are accurate, complete, or current.

6. LINKS
Our company has not reviewed all of the sites linked to our website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by our company of the site. Use of any such linked website is at the user's own risk.

7. MODIFICATIONS
Our company may revise these terms of service for the website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.

8. GOVERNING LAW
These terms and conditions are governed by and construed in accordance with the laws of [JURISDICTION], and you irrevocably submit to the exclusive jurisdiction of the courts in that location.`,
  },
  {
    id: 2,
    name: 'Privacy Policy',
    description: 'Explains how you collect and use customer data',
    body: `PRIVACY POLICY

Last Updated: [DATE]

1. INTRODUCTION
[Your Company Name] ("we" or "us" or "our") operates [website/app name]. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.

2. INFORMATION COLLECTION AND USE
We collect several different types of information for various purposes to provide and improve our Service to you.

Types of Data Collected:
- Personal Data: While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). This may include, but is not limited to:
  * Email address
  * First name and last name
  * Phone number
  * Address, State, Province, ZIP/Postal code, City
  * Cookies and Usage Data

- Usage Data: When you access the Service by or through a mobile device, we may collect certain information automatically, including, but not limited to:
  * The type of mobile device you use
  * Your mobile device unique ID
  * The IP address of your mobile device
  * Your mobile operating system

3. USE OF DATA
[Your Company Name] uses the collected data for various purposes:
- To provide and maintain our Service
- To notify you about changes to our Service
- To allow you to participate in interactive features of our Service when you choose to do so
- To provide customer care and support
- To gather analysis or valuable information so that we can improve our Service
- To monitor the usage of our Service

4. SECURITY OF DATA
The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure.

5. CHANGES TO THIS PRIVACY POLICY
We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "effective date" at the top of this Privacy Policy.

6. CONTACT US
If you have any questions about this Privacy Policy, please contact us at [EMAIL]`,
  },
  {
    id: 3,
    name: 'Return Policy',
    description: 'Define your product return and refund process',
    body: `RETURN & REFUND POLICY

Last Updated: [DATE]

1. GENERAL RETURNS
Products may be returned within [NUMBER] days of purchase if they are in original, unused condition. Items must be returned in their original packaging with all accessories and documentation.

2. HOW TO REQUEST A RETURN
To request a return, please:
1. Contact our customer service team at [EMAIL] with your order number
2. Provide a reason for the return
3. Await authorization and return shipping instructions

3. RETURN SHIPPING
[CHOOSE ONE]:
Option A: Customers are responsible for return shipping costs.
Option B: We provide a prepaid return shipping label.
Option C: For defective items, we cover return shipping.

4. REFUNDS
Once we receive and inspect your returned item, we will send you an email to notify you that we have received your returned item. We will also notify you of the approval or rejection of your refund.

If your return is approved, we will initiate a refund to your original method of payment. The refund will be processed within [NUMBER] business days.

5. DAMAGED OR DEFECTIVE ITEMS
If you receive a damaged or defective item, please contact us within [NUMBER] days of receipt with photos documenting the damage. We will provide a replacement or full refund at our discretion.

6. NON-RETURNABLE ITEMS
The following items are non-returnable:
- Downloadable software products
- Digital goods and content
- Items marked as final sale
- Personalized or customized items

7. EXCEPTIONS
Items may not be returned if:
- The item shows signs of wear, damage, or misuse
- The original packaging or documentation is damaged
- The return window has expired

8. CONTACT US
If you have questions about our return policy, please contact us at [EMAIL] or [PHONE]`,
  },
  {
    id: 4,
    name: 'Disclaimer',
    description: 'Legal protection against liability',
    body: `DISCLAIMER

Last Updated: [DATE]

1. USE "AS IS"
The information on this website is provided "as is" without any representations or warranties, express or implied. [Your Company Name] makes no representations or warranties in relation to this website or the information and materials provided.

2. NO WARRANTIES
We do not warrant that:
- This website will always be available or be uninterrupted
- The information on this website is complete, true, accurate or non-misleading
- Any products or services will be available without interruption or delay

3. LIMITATION OF LIABILITY
[Your Company Name] will not be liable to you in relation to the contents of, or use of, or otherwise in connection with, this website for any indirect, special or consequential loss, or for any business losses, loss of revenue, income, profits or anticipated savings.

4. THIRD-PARTY LINKS
This website contains links to third-party websites. We are not responsible for and do not endorse any content, products, services, or practices of any third-party website.

5. PROFESSIONAL ADVICE
Nothing on this website constitutes professional advice. If you require professional advice, please consult with a qualified professional.

6. INDEMNITY
You agree to indemnify and hold harmless [Your Company Name] from any claims, damages, losses, or expenses arising out of your use of this website or your violation of any laws or the rights of any third party.

7. GOVERNING LAW
This disclaimer is governed by the laws of [JURISDICTION].`,
  },
];

interface SelectedTemplate {
  id: number;
  body: string;
}

export default function LegalDocumentsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(null);
  const [customBody, setCustomBody] = useState('');

  const handleSelectTemplate = (template: (typeof LEGAL_TEMPLATES)[0]) => {
    setSelectedTemplate({ id: template.id, body: template.body });
    setCustomBody(template.body);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(customBody);
    alert('Document copied to clipboard!');
  };

  const handleDownloadDocument = () => {
    const element = document.createElement('a');
    const file = new Blob([customBody], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `legal-document-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-5 shadow-lg backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white tracking-tight">Legal Documents</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Templates for common legal documents</p>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Documents List */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-bold text-white mb-4">Templates</h2>
              <div className="space-y-3">
                {LEGAL_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`w-full text-left p-4 rounded-lg transition border ${
                      selectedTemplate?.id === template.id
                        ? 'bg-white/10 border-white/20'
                        : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800'
                    }`}
                  >
                    <h3 className="font-semibold text-white">{template.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Editor */}
            <div className="lg:col-span-2">
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Document</label>
                    <textarea
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      className="w-full h-96 px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500 font-mono text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex-1 min-w-[140px] bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-lg transition font-semibold text-sm"
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={handleDownloadDocument}
                      className="flex-1 min-w-[140px] bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition font-semibold text-sm"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition font-semibold text-sm"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-2">⚠️ Important: These are templates only.</p>
                    <p className="text-xs text-gray-500">
                      Please consult with a legal professional to ensure compliance with local laws and regulations before using these documents.
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
