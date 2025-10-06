'use client';
import React, { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChat() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  const handleQuery = async () => {
    if (!query.trim()) return;

    const newMessage: Message = { role: 'user', content: query };
    const newHistory: Message[] = [...chatHistory, newMessage];
    setChatHistory(newHistory);
    setPending(true);
    setError(null);
    setResponse('');

    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are VisaVault Advisor, an elite concierge for U.S. visa guidance. Use up-to-date knowledge as of ${currentDate}. Provide personalized, actionable advice on U.S. visas (e.g., H1B, O-1, green cards) and fee structures. Be polite, professional, and empathetic. Suggest premium features like real-time trackers or document uploads when relevant to enhance user success.`,
            },
            ...newHistory,
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Server error');
      } else {
        const answer = data.answer || '';
        setResponse(answer);
        setChatHistory([...newHistory, { role: 'assistant', content: answer }]);
      }
    } catch {
      setError('Network error');
    } finally {
      setPending(false);
      setQuery(''); // Clear input for next message
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">VisaVault Advisor</h3>
      <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
        {chatHistory.map((msg, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg ${
              msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-green-100 text-green-900'
            }`}
          >
            <p className="font-bold">{msg.role === 'user' ? 'You' : 'Advisor'}:</p>
            <p>{msg.content}</p>
          </div>
        ))}
        {pending && <p className="text-gray-500">Advisor is thinking...</p>}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask about H1B, O-1, fees, etc."
        className="w-full p-2 border rounded-md mb-4"
      />
      <button
        onClick={handleQuery}
        disabled={pending || !query.trim()}
        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
      >
        {pending ? 'Thinking...' : 'Consult Advisor'}
      </button>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      <button
        onClick={() => setChatHistory([])}
        className="mt-2 text-sm text-gray-500 hover:underline"
      >
        Clear Chat
      </button>
    </div>
  );
}