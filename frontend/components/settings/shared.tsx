'use client';

import type { ContactDetails } from '@/lib/websiteTemplates';
import { cardClass, inputClass, labelClass } from '../theme';

export { cardClass, inputClass, labelClass };

export type Account = {
  id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  contact?: ContactDetails;
};


export const buttonClass =
  'bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed';


// Reads the error the server sends back, or a fallback message.
export const readError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => ({}));
  return data.error || fallback;
};
