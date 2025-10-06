'use client';
import React, { useState } from 'react';

export default function AIChat() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleQuery = async () => {
    setPending(true);
    setError(null);
    setResponse('');
    try {
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Visa question: ${query}` }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Server error');
      } else {
        setResponse(data.answer || '');
      }
    } catch {
      setError('Network error');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">AI Visa Advisor</h3>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask about H1B, O-1, etc."
        className="w-full p-2 border rounded-md mb-4"
      />
      <button
        onClick={handleQuery}
        disabled={pending || !query.trim()}
        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
      >
        {pending ? 'Thinking…' : 'Ask AI'}
      </button>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {response && <p className="mt-4 text-gray-600 whitespace-pre-wrap">{response}</p>}
    </div>
  );
}