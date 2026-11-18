'use client';

// The assistant used on the Chat, Website Builder and Logo Builder pages. One conversation is shared across all of them.
// Changes to websites wait for the owner's approval, which is shown in a pop-out from the header.
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

// One message in the shared thread. `context` is the page it was sent from; older messages have none and were sent from Chat.
type Turn = { role: 'user' | 'assistant'; text: string; at?: string; context?: string };
type Conversation = { context: string; turns: Turn[] };
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

// A new conversation starts when the owner moves to another page, or after six quiet hours on the same page.
const GAP_MS = 6 * 60 * 60 * 1000;
const groupConversations = (turns: Turn[]): Conversation[] => {
  const groups: Conversation[] = [];
  for (const turn of turns) {
    const context = turn.context || 'Chat';
    const group = groups[groups.length - 1];
    const last = group?.turns[group.turns.length - 1];
    const gap = last?.at && turn.at ? Date.parse(turn.at) - Date.parse(last.at) : 0;
    if (group && group.context === context && gap <= GAP_MS) group.turns.push(turn);
    else groups.push({ context, turns: [turn] });
  }
  return groups;
};

const whenLabel = (at?: string) =>
  at ? new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

// Shows an assistant reply as clean blocks: headings, bullet lists and paragraphs. Markdown symbols are removed, not shown.
type BlockKind = 'heading' | 'list' | 'paragraph';
type ReplyBlock = { kind: BlockKind; lines: string[] };

const parseReply = (text: string): ReplyBlock[] => {
  const blocks: ReplyBlock[] = [];
  let last: ReplyBlock | undefined;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      last = undefined;
      continue;
    }
    const heading = line.match(/^\*\*(.+?)\*\*:?$/);
    const item = line.match(/^[-*•]\s+(.*)$/);
    const kind: BlockKind = heading ? 'heading' : item ? 'list' : 'paragraph';
    const content = heading ? heading[1] : item ? item[1] : line;
    if (!last || last.kind !== kind || kind === 'heading') {
      last = { kind, lines: [] };
      blocks.push(last);
    }
    last.lines.push(content);
  }
  return blocks;
};

// Bold text is kept as bold; any other asterisks are dropped.
const renderInline = (text: string) =>
  text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold text-white">{part.replace(/\*/g, '')}</strong>
    ) : (
      <span key={index}>{part.replace(/\*/g, '')}</span>
    ),
  );

const plainText = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*/g, '');

function Reply({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-7 text-gray-200">
      {parseReply(text).map((block, index) => {
        if (block.kind === 'heading') {
          return <p key={index} className="pt-3 font-semibold text-white">{renderInline(block.lines[0])}</p>;
        }
        if (block.kind === 'list') {
          return (
            <ul key={index} className="space-y-1.5">
              {block.lines.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-3">
                  <span className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-gray-500" aria-hidden="true" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{renderInline(block.lines.join(' '))}</p>;
      })}
    </div>
  );
}

export default function AssistantChat({
  title,
  context = 'Chat',
  compact = false,
  hint = 'Try: "I want to start a dog grooming business in Bristol" or "Make the headline shorter on my main website."',
  onApplied,
  onTurnComplete,
}: {
  title?: string;
  // The page this chat is on, such as "Website Builder". The assistant remembers talk from every page.
  context?: string;
  // Compact fills a card on another page. Full fills the whole page.
  compact?: boolean;
  // Shown before the first message.
  hint?: string;
  // Called with the site id after a site change is approved or undone, so the page showing the site can refresh.
  onApplied?: (siteId: string) => void;
  // Called after each reply. logoChanged is true when the assistant changed the logo draft.
  onTurnComplete?: (result: { logoChanged: boolean }) => void;
}) {
  const [messages, setMessages] = useState<Turn[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [approvalsOpen, setApprovalsOpen] = useState(false);

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
    // Scroll only the conversation, so the page itself does not jump when the builder opens.
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
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
    setMessages((current) => [...current, { role: 'user', text: `${text}${note}`, at: new Date().toISOString(), context }]);
    try {
      const response = await apiFetch('/api/assistant/message', { method: 'POST', json: { message: text, attachments: sent, context } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The assistant could not answer');
      setMessages((current) => [...current, { role: 'assistant', text: data.reply, at: new Date().toISOString(), context }]);
      await loadProposals();
      onTurnComplete?.({ logoChanged: Boolean(data.logoChanged) });
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
      if (action !== 'reject') onApplied?.(proposal.siteId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not do that');
    } finally {
      setBusyId(null);
    }
  };

  const pending = proposals.filter((proposal) => proposal.status === 'pending');
  const applied = proposals.filter((proposal) => proposal.status === 'applied');

  // The main view shows this page's latest conversation. Everything else sits under Previous conversations.
  const conversations = groupConversations(messages);
  const current = [...conversations].reverse().find((conversation) => conversation.context === context);
  const previous = conversations.filter((conversation) => conversation !== current).reverse();
  const shown = current?.turns ?? [];

  return (
    <div className={compact ? 'flex flex-col h-full min-h-0 min-w-0' : 'flex flex-1 flex-col min-w-0 h-[calc(100dvh-3.5rem)] md:h-screen'}>
      {/* A slim header: an optional title, and the approvals button, which opens a pop-out. */}
      <header className="shrink-0 flex items-center gap-3 px-4 md:px-6 h-12 border-b border-white/[0.06]">
        {title && <h1 className="text-sm font-medium text-white truncate">{title}</h1>}
        <button
          type="button"
          onClick={() => setApprovalsOpen(true)}
          className="ml-auto flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 hover:bg-white/[0.06]"
        >
          {pending.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden="true" />}
          Approvals{pending.length > 0 ? ` (${pending.length})` : ''}
        </button>
      </header>

      {/* Collapsed by default. The owner can open earlier conversations from other pages; the assistant remembers them all. */}
      {previous.length > 0 && (
        <details className="group shrink-0 border-b border-white/[0.06] px-4 md:px-6 py-2.5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-gray-400 hover:text-gray-200">
            Previous conversations ({previous.length})
            <span className="text-gray-500 transition group-open:rotate-180" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {previous.map((conversation, index) => (
              <details key={index} className="rounded-lg border border-white/[0.06] px-3 py-2">
                <summary className="cursor-pointer list-none text-xs text-gray-300">
                  <span className="font-medium text-gray-100">{conversation.context}</span>
                  <span className="text-gray-500">
                    {' '}· {whenLabel(conversation.turns[0].at)} · {conversation.turns.length} {conversation.turns.length === 1 ? 'message' : 'messages'}
                  </span>
                </summary>
                <div className="mt-2 space-y-2 text-xs leading-relaxed text-gray-400">
                  {conversation.turns.map((turn, turnIndex) => (
                    <p key={turnIndex} className="whitespace-pre-wrap">
                      <span className="text-gray-500">{turn.role === 'user' ? 'You: ' : 'Assistant: '}</span>
                      {plainText(turn.text)}
                    </p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </details>
      )}

      {/* The conversation. Newest messages are at the bottom; scroll up for earlier ones. */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-5">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {shown.length === 0 && <p className="text-sm text-gray-500">{hint}</p>}
          {shown.map((turn, index) =>
            turn.role === 'user' ? (
              <div key={index} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-white px-4 py-2.5 text-sm leading-relaxed text-black whitespace-pre-wrap">{turn.text}</div>
              </div>
            ) : (
              // Assistant replies are plain text, so the conversation reads cleanly.
              <div key={index} className="max-w-3xl">
                <Reply text={turn.text} />
              </div>
            ),
          )}
          {sending && <p className="text-sm text-gray-500">Thinking...</p>}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.06] px-4 md:px-6 py-3">
        <div className="w-full max-w-4xl mx-auto">
          {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-md bg-white/[0.06] px-2.5 py-1 text-xs text-gray-300">
                  {file.name}
                  <button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} className="text-gray-500 hover:text-gray-200" aria-label={`Remove ${file.name}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-1.5 focus-within:border-white/25">
            <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-400 hover:bg-white/[0.06] hover:text-gray-200" title="Attach a file" aria-label="Attach a file">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <input
                type="file"
                multiple
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
              placeholder="Message the assistant"
              maxLength={2000}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm text-gray-100 placeholder-gray-500 outline-none"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || (!input.trim() && files.length === 0)}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-black transition disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Approvals pop out from the right. Nothing goes live until it is approved here. */}
      {approvalsOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Waiting for your approval">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setApprovalsOpen(false)} aria-label="Close approvals" />
          <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-black p-5 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Approvals</h2>
              <button type="button" onClick={() => setApprovalsOpen(false)} className="text-sm text-gray-400 hover:text-white">
                Close
              </button>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">Waiting for your approval</h3>
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

            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">Recently applied</h3>
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
          </div>
        </div>
      )}
    </div>
  );
}
