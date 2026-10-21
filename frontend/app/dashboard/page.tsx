'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  dbId?: string; // ID from database if loaded from history
}

// Simple markdown formatter
function formatMarkdown(text: string) {
  return text
    .split('\n')
    .map((line, idx) => {
      // Bold: **text** -> <strong>text</strong>
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic: *text* -> <em>text</em>
      line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Code: `text` -> <code>text</code>
      line = line.replace(/`(.*?)`/g, '<code>$1</code>');

      // Bullet points: - text or * text -> <li>text</li>
      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        line = '<li>' + line.replace(/^[\s\-\*]+/, '').trim() + '</li>';
      }

      // Numbers: 1. text -> <li>text</li>
      if (/^\d+\./.test(line.trim())) {
        line = '<li>' + line.replace(/^\d+\.\s*/, '').trim() + '</li>';
      }

      return line;
    })
    .join('\n');
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Welcome to Venture-Pro. Describe your business idea and I will help you plan it, write the copy and build the website.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation history when projectId changes
  useEffect(() => {
    if (projectId) {
      loadConversationHistory(projectId);
    }
  }, [projectId]);

  // Load conversation history from database
  const loadConversationHistory = async (id: string) => {
    setLoadingHistory(true);
    try {
      const response = await apiFetch(`/api/chat/${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          // Convert database messages to UI format
          const conversationMessages = data.flatMap((msg: any) => [
            {
              id: `${msg.id}-user`,
              type: 'user' as const,
              content: msg.userMessage,
              dbId: msg.id,
            },
            {
              id: `${msg.id}-ai`,
              type: 'ai' as const,
              content: msg.aiResponse,
              dbId: msg.id,
            },
          ]);
          setMessages(conversationMessages);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Save message to database
  const saveMessageToDatabase = async (userMsg: string, aiMsg: string) => {
    if (!projectId) return; // Only save if we have a projectId

    try {
      await apiFetch('/api/chat/save', {
        method: 'POST',
        json: {
          projectId,
          userMessage: userMsg,
          aiResponse: aiMsg,
        },
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiFetch('/api/chat/message', {
        method: 'POST',
        json: {
          message: userText,
          ...(projectId ? { projectId } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const aiText = data.message;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiText,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Save to database if projectId exists
      await saveMessageToDatabase(userText, aiText);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again in a moment.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen app-bg flex">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-white/[0.06] px-8 py-4">
          <h1 className="text-base font-semibold text-white tracking-tight">Chat</h1>
          <p className="text-gray-500 text-xs mt-0.5">Plan your business with an AI partner</p>
        </div>

        {/* Chat Container */}
      <div className="flex-1 overflow-y-auto px-8 py-10 space-y-6 max-w-3xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`animate-fade-in ${message.type === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
          >
            {message.type === 'user' ? (
              <div className="max-w-xl px-4 py-2.5 rounded-2xl bg-white/[0.08] text-gray-100 text-sm">
                {message.content}
              </div>
            ) : (
              <div className="max-w-2xl text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(message.content)
                      .replace(/<strong>(.*?)<\/strong>/g, '<strong style="color: white; font-weight: 600;">$1</strong>')
                      .replace(/<code>(.*?)<\/code>/g, '<code style="background-color: rgb(31, 41, 55); color: rgb(147, 197, 253); padding: 2px 6px; border-radius: 4px; font-size: 0.875rem; font-family: monospace;">$1</code>')
                      .replace(/<em>(.*?)<\/em>/g, '<em style="color: rgb(209, 213, 219); font-style: italic;">$1</em>')
                      .replace(/<li>(.*?)<\/li>/g, '<div style="margin-left: 1rem; margin-bottom: 0.5rem;">• $1</div>'),
                  }}
                />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex space-x-1.5 py-3">
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

        {/* Input Area */}
        <div className="border-t border-white/[0.06] px-8 py-5">
          <form onSubmit={handleSendMessage} className="relative max-w-3xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me about your business idea"
              className="w-full bg-white/[0.04] text-gray-100 pl-4 pr-12 py-3 rounded-xl border border-white/10 focus:border-white/25 outline-none placeholder-gray-600 transition text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center transition hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </div>

        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}

