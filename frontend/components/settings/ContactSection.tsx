'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { ContactEditor } from '@/components/SiteDetailsEditor';
import type { ContactDetails } from '@/lib/websiteTemplates';
import { type Account, cardClass, buttonClass, readError } from './shared';

// The owner's business contact details. New sites start with these, and each site can change them.
export default function ContactSection({ account, onSaved }: { account: Account; onSaved: (account: Account) => void }) {
  const [contact, setContact] = useState<ContactDetails>(account.contact || {});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await apiFetch('/api/auth/contact', { method: 'PUT', json: { contact } });
      if (!response.ok) throw new Error(await readError(response, 'Could not save your contact details'));
      const data = await response.json();
      onSaved(data.user);
      setMessage('Saved. New sites start with these details.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your contact details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cardClass}>
      <ContactEditor value={contact} onChange={setContact} />
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={saving} className={buttonClass}>
          {saving ? 'Saving...' : 'Save contact details'}
        </button>
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
