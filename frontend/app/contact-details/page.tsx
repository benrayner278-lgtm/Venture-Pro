'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';
import ContactSection from '@/components/settings/ContactSection';
import { type Account, readError } from '@/components/settings/shared';
import { PageHeader } from '@/components/theme';

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
        <PageHeader title="Contact details" subtitle="Your business contact details. New websites start with these." accent="sage" />

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
