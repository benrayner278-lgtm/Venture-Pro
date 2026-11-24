'use client';

import type { ContactDetails } from '@/lib/websiteTemplates';

export type Account = {
  id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  contact?: ContactDetails;
};


export const inputClass =
  'w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500';
export const labelClass = 'block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2';
export const cardClass = 'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6';
export const buttonClass =
  'bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed';


// Reads the error the server sends back, or a fallback message.
export const readError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => ({}));
  return data.error || fallback;
};
