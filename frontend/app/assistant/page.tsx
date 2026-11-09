'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

type Turn = { role: 'user' | 'assistant'; text: string };
type Proposal = { id: string; siteId: string; siteTitle: string; summary: string; status: string };
type Attachment = { name: string; type: string; data: string };

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_FILES = 4;
const TYPE_BY_EXTENSION: Record<string, string> = { md: 'text/markdown', csv: 'text/csv', json: 'application/json', txt: 'text/plain' };

// Reads a file as base64 (without the data: prefix), so it can be sent with the message.
const readFile = (file: File) =>
  new Promise<Attachment>((resolve, reject) => {
    const type = file.type || TYPE_BY_EXTENSION[file.name.split('.').pop()?.toLowerCase() || ''] || '';
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type, data: String(reader.result).split(',')[1] || '' });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });

export default function AssistantPage() {
  const [messages, setMessages] = useState<Turn[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadProposals = async () => {
    const response = await apiFetch('/api/assistant/proposals');
    if (response.ok) setProposals((await response.json()).proposals);
  };

  useEffect(() => {
    apiFetch('/api/assistant/thread')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setMessages(data.messages))
      .catch(() => {});
    loadProposals().catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  const addFiles = async (picked: FileList | null) => {
    if (!picked) return;
    setError('');
    const chosen: Attachment[] = [];
    for (const file of Array.from(picked)) {
      if (files.length + chosen.length >= MAX_FILES) {
        setError(`Attach up to ${MAX_FILES} files at a time`);
        break;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name} is larger than 3 MB`);
        continue;
      }
      try {
        chosen.push(await readFile(file));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read that file');
      }
    }
    setFiles((current) => [...current, ...chosen]);
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && files.length === 0) || sending) return;
    const sent = files;
    const note = sent.length ? `${text ? ' ' : ''}[Attached: ${sent.map((file) => file.name).join(', ')}]` : '';
    setInput('');
    setFiles([]);
    setError('');
    setSending(true);
    setMessages((current) => [...current, { role: 'user', text: `${text}${note}` }]);
    try {
      const response = await apiFetch('/api/assistant/message', { method: 'POST', json: { message: text, attachments: sent } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The assistant could not answer');
      setMessages((current) => [...current, { role: 'assistant', text: data.reply }]);
      await loadProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The assistant could not answer');
    } finally {
      setSending(false);
    }
  };

  // Approve, reject or undo a proposal. The server checks the site has not changed since the proposal.
  const decide = async (proposal: Proposal, action: 'approve' | 'reject' | 'undo') => {
    setBusyId(proposal.id);
    setError('');
    try {
      const response = await apiFetch(`/api/assistant/proposals/${proposal.id}/${action}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not do that');
      await loadProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not do that');
    } finally {
      setBusyId(null);
    }
  };

  const pending = proposals.filter((proposal) => proposal.status === 'pending');
  const applied = proposals.filter((proposal) => proposal.status === 'applied');

  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />
      <div className="flex-1 min-w-0 text-gray-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-[1fr_340px]">
        <section className="flex flex-col min-h-[70vh]">
          <h1 className="text-2xl font-semibold">Assistant</h1>
          <p className="text-sm text-gray-400 mb-4">Ask for changes to your websites. Nothing goes live until you approve it.</p>

          <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 min-h-[320px]">
            {messages.length === 0 && <p className="text-sm text-gray-500">Try: &quot;Make the headline shorter on my main website.&quot;</p>}
            {messages.map((turn, index) => (
              <div key={index} className={turn.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${turn.role === 'user' ? 'bg-white text-black' : 'bg-white/5 text-gray-200'}`}>
                  {turn.text}
                </div>
              </div>
            ))}
            {sending && <p className="text-sm text-gray-500">Thinking...</p>}
            <div ref={endRef} />
          </div>

          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
          {files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs text-gray-300">
                  {file.name}
                  <button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} className="text-gray-500 hover:text-gray-200" aria-label={`Remove ${file.name}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <label className="flex items-center px-3 rounded-xl border border-white/10 text-sm text-gray-300 cursor-pointer hover:bg-white/5" title="Attach a photo, PDF or text file">
              Attach
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,.md,.csv,.txt,.json"
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              placeholder="Ask for a change"
              maxLength={2000}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
            />
            <button type="button" onClick={send} disabled={sending || (!input.trim() && files.length === 0)} className="bg-white text-black px-5 rounded-xl text-sm font-medium disabled:opacity-40">
              Send
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 p-4">
            <h2 className="text-sm font-semibold mb-3">Waiting for your approval</h2>
            {pending.length === 0 && <p className="text-sm text-gray-500">Nothing to approve.</p>}
            {pending.map((proposal) => (
              <div key={proposal.id} className="border-t border-white/10 pt-3 mt-3 first:border-0 first:mt-0 first:pt-0">
                <p className="text-xs text-gray-500">{proposal.siteTitle}</p>
                <p className="text-sm text-gray-200 mb-2">{proposal.summary}</p>
                <div className="flex gap-2">
                  <button type="button" disabled={busyId === proposal.id} onClick={() => decide(proposal, 'approve')} className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40">
                    Approve and publish
                  </button>
                  <button type="button" disabled={busyId === proposal.id} onClick={() => decide(proposal, 'reject')} className="border border-white/10 text-gray-300 px-3 py-1.5 rounded-lg text-xs disabled:opacity-40">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 p-4">
            <h2 className="text-sm font-semibold mb-3">Recently applied</h2>
            {applied.length === 0 && <p className="text-sm text-gray-500">No recent changes.</p>}
            {applied.map((proposal) => (
              <div key={proposal.id} className="border-t border-white/10 pt-3 mt-3 first:border-0 first:mt-0 first:pt-0">
                <p className="text-xs text-gray-500">{proposal.siteTitle}</p>
                <p className="text-sm text-gray-200 mb-2">{proposal.summary}</p>
                <button type="button" disabled={busyId === proposal.id} onClick={() => decide(proposal, 'undo')} className="border border-white/10 text-gray-300 px-3 py-1.5 rounded-lg text-xs disabled:opacity-40">
                  Undo
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
      </div>
    </div>
  );
}
