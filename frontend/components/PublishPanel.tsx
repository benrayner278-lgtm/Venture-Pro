'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { WebsiteContent } from '@/lib/websiteTemplates';

type SiteSummary = { id: string; slug: string; url: string; updatedAt: string };
type SlugCheck = { available: boolean; reason: string | null };

const cleanSlug = (value: string) =>
  value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-');

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export default function PublishPanel({
  content,
  themeId,
  shuffle,
}: {
  content: WebsiteContent;
  themeId: string;
  shuffle: number;
}) {
  const [slug, setSlug] = useState('');
  const [check, setCheck] = useState<SlugCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<SiteSummary | null>(null);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [message, setMessage] = useState('');

  const loadSites = async () => {
    const res = await apiFetch('/api/sites');
    if (res.ok) {
      const data = await res.json();
      setSites(data.sites);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (!slug || live) {
      setCheck(null);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await apiFetch(`/api/sites/check?slug=${encodeURIComponent(slug)}`);
      if (res.ok) setCheck(await res.json());
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, live]);

  const publish = async () => {
    setBusy(true);
    setMessage('');
    try {
      const res = await apiFetch('/api/sites', {
        method: 'POST',
        json: { slug, content, themeId, shuffle },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not publish the site');
      setLive(data.site);
      setMessage('Your site is live.');
      loadSites();
    } catch (error) {
      setMessage(errorMessage(error, 'Could not publish the site'));
    } finally {
      setBusy(false);
    }
  };

  const updateLive = async () => {
    if (!live) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await apiFetch(`/api/sites/${live.id}`, {
        method: 'PUT',
        json: { content, themeId, shuffle },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update the site');
      setMessage('Live site updated.');
      loadSites();
    } catch (error) {
      setMessage(errorMessage(error, 'Could not update the site'));
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async (site: SiteSummary) => {
    if (!window.confirm(`Remove ${site.url}? The address will become free to use again.`)) return;
    const res = await apiFetch(`/api/sites/${site.id}`, { method: 'DELETE' });
    if (res.ok) {
      if (live?.id === site.id) setLive(null);
      loadSites();
    } else {
      setMessage('Could not remove that site.');
    }
  };

  return (
    <div className="space-y-4 border-t border-white/[0.06] pt-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Publish</p>

      {live ? (
        <div className="space-y-2">
          <a href={live.url} target="_blank" rel="noreferrer" className="block text-sm text-white underline underline-offset-4 break-all">
            {live.url}
          </a>
          <button
            onClick={updateLive}
            disabled={busy}
            className="w-full bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl transition font-medium text-sm disabled:opacity-40"
          >
            {busy ? 'Updating...' : 'Update live site'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] focus-within:border-white/25">
            <input
              value={slug}
              onChange={(e) => setSlug(cleanSlug(e.target.value))}
              placeholder="your-business"
              maxLength={40}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-100 outline-none placeholder-gray-600"
            />
            <span className="pr-3 text-xs text-gray-500">.venture-pro.io</span>
          </div>
          {check && (
            <p className={`text-xs ${check.available ? 'text-emerald-400' : 'text-red-400'}`}>
              {check.available ? 'Available' : check.reason}
            </p>
          )}
          <button
            onClick={publish}
            disabled={busy || !check?.available}
            className="w-full bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl transition font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Publishing...' : 'Publish site'}
          </button>
        </div>
      )}

      {message && <p className="text-xs text-gray-400">{message}</p>}

      {sites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">My sites</p>
          {sites.map((site) => (
            <div key={site.id} className="flex items-center justify-between gap-2 text-xs">
              <a href={site.url} target="_blank" rel="noreferrer" className="truncate text-gray-300 hover:text-white">
                {site.slug}.venture-pro.io
              </a>
              <button onClick={() => unpublish(site)} className="shrink-0 text-gray-500 hover:text-red-400">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
