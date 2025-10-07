'use client';
import React, { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SourceLink {
  i: number;
  title: string;
  url: string;
}

export default function AIChat() {
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, pending]);

  const send = async () => {
    if (!query.trim() || pending) return;

    const newHistory: Message[] = [...chatHistory, { role: 'user', content: query.trim() }];
    setChatHistory(newHistory);
    setPending(true);
    setError(null);
    setQuery('');

    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No toggle: server auto-detects when to fetch fresh sources
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are VisaVault Advisor, an elite concierge. Use up-to-date knowledge as of ${currentDate}. Be concise, accurate, and empathetic. If info may have changed after ${currentDate}, say so and suggest verifying.`,
            },
            ...newHistory,
          ],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Server error');
        return;
      }

      const answer = (data.answer as string) || '';
      const sources = (data.sources as SourceLink[]) || [];

      // Append sources if server used web freshness
      const cited =
        sources.length > 0
          ? `\n\nSources:\n${sources.map((s) => `[${s.i}] ${s.title} — ${s.url}`).join('\n')}`
          : '';

      const full = answer + cited;
      setChatHistory([...newHistory, { role: 'assistant', content: full }]);
    } catch {
      setError('Network error');
    } finally {
      setPending(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    setError(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">VisaVault Advisor</h3>

      <div className="max-h-64 overflow-y-auto mb-4 space-y-2 pr-1">
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`p-2 rounded-lg whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-blue-100 text-blue-900'
                : 'bg-green-100 text-green-900'
            }`}
          >
            <p className="font-bold mb-1">{msg.role === 'user' ? 'You' : 'Advisor'}:</p>
            <p>{msg.content}</p>
          </div>
        ))}
        {pending && <p className="text-gray-500">Advisor is thinking...</p>}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about H1B fees, lottery caps, O-1 evidence, PERM timelines, etc."
          className="w-full p-2 border rounded-md"
        />
        <button
          onClick={send}
          disabled={pending || !query.trim()}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {pending ? 'Thinking…' : 'Send'}
        </button>
      </div>

      {error && <p className="mt-3 text-red-600">{error}</p>}

      <button onClick={clearChat} className="mt-3 text-sm text-gray-500 hover:underline">
        Clear Chat
      </button>
    </div>
  );
}
