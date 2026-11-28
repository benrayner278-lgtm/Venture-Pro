'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/theme';
import { inputClass, labelClass } from '@/components/theme';

type Mailbox = { id: string; address: string; status: 'setting_up' | 'ready'; siteId: string; siteTitle: string };
type SiteOption = { id: string; title: string; domain: string };
type EmailState = { plan: string; allowance: number; used: number; mailboxes: Mailbox[]; sites: SiteOption[]; domain: string };

// Where the owner reads their mail. Set NEXT_PUBLIC_WEBMAIL_URL if the webmail address differs.
const WEBMAIL_URL = process.env.NEXT_PUBLIC_WEBMAIL_URL || 'https://webmail.migadu.com';

export default function EmailPage() {
  const [state, setState] = useState<EmailState | null>(null);
  const [error, setError] = useState('');
  const [siteId, setSiteId] = useState('');
  const [localPart, setLocalPart] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = () =>
    apiFetch('/api/mailboxes')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load your email');
        const data: EmailState = await response.json();
        setState(data);
        setSiteId((current) => current || data.sites[0]?.id || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your email'));

  useEffect(() => {
    load();
  }, []);

  // Creates a mailbox, or finishes one that is still setting up. Only runs after the owner ticks the confirmation.
  const create = async (siteChoice: string, name: string) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await apiFetch('/api/mailboxes', { method: 'POST', json: { siteId: siteChoice, localPart: name } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create the mailbox');
      setMessage(data.message);
      if (data.mailbox?.status === 'ready') {
        setLocalPart('');
        setConfirmed(false);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the mailbox');
    } finally {
      setBusy(false);
    }
  };

  const chosenSite = state?.sites.find((site) => site.id === siteId);
  const canAdd = Boolean(state && state.allowance > 0 && state.used < state.allowance);
  const cleanName = localPart.trim().toLowerCase();

  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader title="Email" subtitle="A business address on your own site, such as hello@yourbusiness.venture-pro.io." accent="lilac" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl space-y-6">
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!state && !error && <p className="text-sm text-gray-500">Loading your email...</p>}

          {state && (
            <>
              <div className="rounded-2xl border border-white/10 p-5 space-y-2">
                <p className="text-sm text-gray-200">
                  Your {state.plan} plan includes {state.allowance} mailbox{state.allowance === 1 ? '' : 'es'}. You are using {state.used}.
                </p>
                {state.allowance === 0 && (
                  <p className="text-sm text-amber-300">
                    Email needs the Standard plan or above. <Link href="/billing?needs=email" className="underline">See plans</Link>
                  </p>
                )}
              </div>

              {message && <p className="text-sm text-emerald-400">{message}</p>}

              {state.mailboxes.length > 0 && (
                <div className="space-y-3">
                  <label className={labelClass}>Your mailboxes</label>
                  {state.mailboxes.map((mailbox) => (
                    <div key={mailbox.id} className="rounded-2xl border border-white/10 p-5 space-y-2">
                      <p className="text-sm font-medium text-white break-all">{mailbox.address}</p>
                      <p className="text-xs text-gray-500">On {mailbox.siteTitle}</p>
                      {mailbox.status === 'ready' ? (
                        <>
                          <p className="text-xs text-emerald-400">Ready. Check your email for the invitation to choose your password.</p>
                          <a href={WEBMAIL_URL} target="_blank" rel="noreferrer" className="inline-block pt-1 text-sm text-gray-200 underline underline-offset-4 hover:text-white">
                            Open webmail
                          </a>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-amber-300">Still being set up. This can take a few minutes.</p>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => create(mailbox.siteId, mailbox.address.split('@')[0])}
                            className="border border-white/10 hover:bg-white/5 disabled:opacity-40 text-gray-200 px-4 py-2 rounded-xl text-sm font-medium transition"
                          >
                            Check again
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canAdd && state.sites.length > 0 && (
                <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 space-y-4">
                  <div>
                    <label className={labelClass}>Website</label>
                    <select className={inputClass} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                      {state.sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Address name</label>
                    <div className="flex items-center gap-2">
                      <input className={inputClass} value={localPart} maxLength={30} onChange={(e) => setLocalPart(e.target.value)} placeholder="e.g. hello" />
                    </div>
                    {cleanName && chosenSite && (
                      <p className="mt-2 text-xs text-gray-400 break-all">
                        Your address will be {cleanName}@{chosenSite.domain}
                      </p>
                    )}
                  </div>
                  <label className="flex items-start gap-3 text-sm text-gray-200">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-white" />
                    <span>
                      I want to create this address. An invitation will be sent to my account email so I can choose my own password.
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={busy || !confirmed || !cleanName || !siteId}
                    onClick={() => create(siteId, cleanName)}
                    className="w-full bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40"
                  >
                    {busy ? 'Setting up...' : 'Create my mailbox'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
