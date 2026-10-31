'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';

type DomainSetup = {
  domain: string;
  verified: boolean;
  verifiedAt: string | null;
  recordType: 'CNAME' | 'ALIAS';
  target: string;
  txtName: string;
  txtValue: string;
} | null;
type SiteRow = { id: string; slug: string; title: string; url: string; domain: DomainSetup };
type Check = { verified: boolean; pointing: boolean; targetAddresses: string[] };

const inputClass =
  'px-3 py-2 bg-white/[0.04] text-gray-100 rounded-lg border border-white/10 focus:border-white/40 outline-none transition';
const labelClass = 'block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2';
const cardClass = 'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6';
const buttonClass =
  'bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50';

export default function DomainPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteId, setSiteId] = useState('');
  const [draft, setDraft] = useState('');
  const [check, setCheck] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const site = sites.find((row) => row.id === siteId);
  const domain = site?.domain ?? null;

  useEffect(() => {
    apiFetch('/api/sites')
      .then((res) => res.json())
      .then((data) => {
        const list: SiteRow[] = data.sites || [];
        setSites(list);
        if (list[0]) {
          setSiteId(list[0].id);
          setDraft(list[0].domain?.domain ?? '');
        }
      })
      .catch(() => {});
  }, []);

  const selectSite = (id: string) => {
    setSiteId(id);
    setDraft(sites.find((row) => row.id === id)?.domain?.domain ?? '');
    setCheck(null);
    setMessage('');
    setError('');
  };

  const applyDomain = (next: DomainSetup) =>
    setSites((current) => current.map((row) => (row.id === siteId ? { ...row, domain: next } : row)));

  const save = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    setCheck(null);
    try {
      const response = await apiFetch(`/api/sites/${siteId}/domain`, { method: 'PUT', json: { domain: draft } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save the domain');
      applyDomain(data.domain);
      setDraft(data.domain.domain);
      setMessage('Domain saved. Add the two DNS records below, then press Check now.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the domain');
    } finally {
      setBusy(false);
    }
  };

  const runCheck = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await apiFetch(`/api/sites/${siteId}/domain/check`, { method: 'POST' });
      const data = await response.json();
      if (data.domain) applyDomain(data.domain);
      setCheck(data.check ?? null);
      if (!response.ok) throw new Error(data.error || 'Could not check the domain');
      setMessage(
        data.domain.verified
          ? 'Your domain is connected. The secure certificate can take a few minutes to appear.'
          : 'Not connected yet. DNS changes can take a while to show up, so try again later.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check the domain');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Remove this domain? The site will stop answering on it, and your Venture-Pro address keeps working.')) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await apiFetch(`/api/sites/${siteId}/domain`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not remove the domain');
      applyDomain(null);
      setDraft('');
      setCheck(null);
      setMessage('Domain removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the domain');
    } finally {
      setBusy(false);
    }
  };

  const isWww = domain?.domain.startsWith('www.') ?? false;

  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-white/[0.06] px-4 md:px-8 py-4">
          <h1 className="text-base font-semibold text-white tracking-tight">Domain</h1>
          <p className="text-gray-500 text-xs mt-0.5">Show your published website on your own web address.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {sites.length === 0 ? (
            <p className="text-sm text-gray-400">Publish a website first, then you can connect your own domain to it.</p>
          ) : (
            <div className="max-w-3xl space-y-6">
              <div>
                <label className={labelClass}>Website</label>
                <select className={`${inputClass} w-full`} value={siteId} onChange={(e) => selectSite(e.target.value)}>
                  {sites.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.title} ({row.slug}.venture-pro.io)
                    </option>
                  ))}
                </select>
              </div>

              <div className={cardClass}>
                <label className={labelClass} htmlFor="domain">Your domain</label>
                <p className="text-xs text-gray-500 mb-4">
                  Enter the address you own, such as yourbusiness.com or www.yourbusiness.com. Your Venture-Pro address keeps working as well.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    id="domain"
                    className={`${inputClass} flex-1`}
                    placeholder="yourbusiness.com"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <button type="button" onClick={save} disabled={busy || !draft.trim()} className={buttonClass}>
                    {domain ? 'Update domain' : 'Save domain'}
                  </button>
                </div>
                {message && <p className="text-sm text-emerald-400 mt-4">{message}</p>}
                {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
              </div>

              {domain && (
                <div className={`${cardClass} space-y-6`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">{domain.domain}</p>
                      <p className="text-xs text-gray-500 mt-1">Your Venture-Pro address: {site?.slug}.venture-pro.io</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                        domain.verified ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {domain.verified ? 'Connected' : 'Not connected yet'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-white">1. Add a verification record</p>
                    <p className="text-xs text-gray-500">This proves the domain is yours.</p>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="text-gray-500">Type</dt>
                      <dd className="text-gray-200">TXT</dd>
                      <dt className="text-gray-500">Name</dt>
                      <dd className="text-gray-200 break-all">{domain.txtName}</dd>
                      <dt className="text-gray-500">Value</dt>
                      <dd className="text-gray-200 break-all font-mono text-xs">{domain.txtValue}</dd>
                    </dl>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-white">2. Point your domain at Venture-Pro</p>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="text-gray-500">Type</dt>
                      <dd className="text-gray-200">{domain.recordType}</dd>
                      <dt className="text-gray-500">Name</dt>
                      <dd className="text-gray-200">{isWww ? 'www' : '@ (or leave blank)'}</dd>
                      <dt className="text-gray-500">Value</dt>
                      <dd className="text-gray-200 break-all font-mono text-xs">{domain.target}</dd>
                    </dl>
                    {!isWww && (
                      <p className="text-xs text-gray-500">
                        A bare domain needs an ALIAS or ANAME record. If your DNS provider only supports A records, press Check now and we will show the addresses to use.
                      </p>
                    )}
                    {check && !check.pointing && check.targetAddresses.length > 0 && (
                      <p className="text-xs text-gray-400">
                        A records to use: <span className="font-mono">{check.targetAddresses.join(', ')}</span>
                      </p>
                    )}
                  </div>

                  {check && (
                    <ul className="space-y-1 text-sm">
                      <li className={check.verified ? 'text-emerald-300' : 'text-gray-400'}>
                        {check.verified ? 'Verification record found' : 'Verification record not found yet'}
                      </li>
                      <li className={check.pointing ? 'text-emerald-300' : 'text-gray-400'}>
                        {check.pointing ? 'Domain points at Venture-Pro' : 'Domain does not point at Venture-Pro yet'}
                      </li>
                    </ul>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={runCheck} disabled={busy} className={buttonClass}>
                      Check now
                    </button>
                    <button
                      type="button"
                      onClick={remove}
                      disabled={busy}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/10 transition disabled:opacity-50"
                    >
                      Remove domain
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">DNS changes can take up to 24 hours to spread across the internet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
