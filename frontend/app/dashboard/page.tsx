'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

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
      content: 'Welcome to Venture-Pro! 👋 I\'m your AI business builder. Tell me about your business idea and I\'ll help you build everything from scratch.',
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
      const response = await fetch(`http://localhost:3001/api/chat/${id}`);
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
      await fetch('http://localhost:3001/api/chat/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userMessage: userMsg,
          aiResponse: aiMsg,
        }),
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
      const response = await fetch('http://localhost:3001/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          userId: localStorage.getItem('userId') || 'anonymous',
        }),
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-gray-900 flex">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-5 shadow-lg backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white tracking-tight">Chat</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Your AI business assistant</p>
        </div>

        {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-3xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`animate-fade-in ${message.type === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
          >
            {message.type === 'user' ? (
              <div className="max-w-xl px-5 py-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-white font-medium">
                {message.content}
              </div>
            ) : (
              <div className="max-w-2xl text-gray-200 leading-relaxed whitespace-pre-wrap">
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
            <div className="flex space-x-3 py-4">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

        {/* Input Area */}
        <div className="bg-gray-900/50 border-t border-gray-800/50 px-8 py-6 backdrop-blur-sm">
          <form onSubmit={handleSendMessage} className="flex gap-3 max-w-3xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me about your business idea..."
              className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none placeholder-gray-500 transition text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Send
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

