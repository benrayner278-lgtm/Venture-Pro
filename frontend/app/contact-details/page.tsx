'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';
import ContactSection from '@/components/settings/ContactSection';
import { type Account, readError } from '@/components/settings/shared';

export default function ContactDetailsPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Could not load your account'));
        const data = await response.json();
        setAccount(data.user);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load your account'));
  }, []);

  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-5 shadow-lg backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white tracking-tight">Contact details</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Your business contact details. New websites start with these.</p>
        </div>

        <div className="flex-1 p-8">
          {loadError && <p className="text-sm text-red-400">{loadError}</p>}
          {!account && !loadError && <p className="text-sm text-gray-400">Loading your details...</p>}
          {account && (
            <div className="max-w-2xl">
              <ContactSection account={account} onSaved={setAccount} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
