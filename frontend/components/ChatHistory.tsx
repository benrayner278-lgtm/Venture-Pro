'use client';

// The chat history: each conversation is named after what the owner first asked, and listed in a side panel from the Chat tab.
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';

// One message in the shared thread. `context` is the page it was sent from; older messages have none and were sent from Chat.
export type Turn = { role: 'user' | 'assistant'; text: string; at?: string; context?: string };
export type Conversation = { context: string; turns: Turn[] };

// A new conversation starts when the owner moves to another page, or after six quiet hours on the same page.
const GAP_MS = 6 * 60 * 60 * 1000;
export const groupConversations = (turns: Turn[]): Conversation[] => {
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

export const whenLabel = (at?: string) =>
  at ? new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export const conversationKey = (conversation: Conversation) => `${conversation.context}|${conversation.turns[0]?.at ?? ''}`;

// Names a conversation after the first thing the owner asked, without markdown or attachment notes.
export const conversationTitle = (turns: Turn[]) => {
  const first = turns.find((turn) => turn.role === 'user');
  const text = (first?.text || '')
    .replace(/\[Attached:[^\]]*\]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return first ? 'Shared files' : 'New conversation';
  return text.length > 60 ? `${text.slice(0, 60).trimEnd()}…` : text;
};

// The side panel that opens from the Chat tab. Choosing a conversation shows it in Chat.
export function ChatHistoryPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  useEffect(() => {
    apiFetch('/api/assistant/thread')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setConversations([...groupConversations(data?.messages ?? [])].reverse()))
      .catch(() => setConversations([]));
  }, []);

  const open = (conversation: Conversation) => {
    const key = conversationKey(conversation);
    if (pathname !== '/dashboard') {
      // Chat is not mounted here yet, so it reads the choice when it opens.
      try {
        sessionStorage.setItem('chat:open', key);
      } catch {
        // Storage can be blocked; the conversation then opens on the current chat.
      }
      router.push('/dashboard');
    } else {
      window.dispatchEvent(new CustomEvent<string>('chat:open', { detail: key }));
    }
    onClose();
  };

  return (
    <div className="fixed inset-y-0 left-0 md:left-64 z-[45] flex w-full flex-col border-r border-white/[0.08] bg-black md:w-80" role="dialog" aria-label="Chat history">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
        <h2 className="text-sm font-semibold text-white">Chat history</h2>
        <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-gray-400 hover:text-white">
          Close
        </button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {conversations === null && <p className="px-3 py-2 text-sm text-gray-500">Loading...</p>}
        {conversations?.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">No conversations yet. Start one in Chat.</p>}
        {conversations?.map((conversation) => (
          <button
            key={conversationKey(conversation)}
            type="button"
            onClick={() => open(conversation)}
            className="w-full rounded-lg px-3 py-3 text-left transition hover:bg-white/[0.06]"
          >
            <p className="truncate text-sm font-medium text-gray-100">{conversationTitle(conversation.turns)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {conversation.context} · {whenLabel(conversation.turns[0]?.at)} · {conversation.turns.length} {conversation.turns.length === 1 ? 'message' : 'messages'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
