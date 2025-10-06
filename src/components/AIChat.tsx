'use client';
import { useState } from 'react';

export default function AIChat() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');

  const handleQuery = async () => {
    const res = await fetch('/api/openai', {
      method: 'POST',
      body: JSON.stringify({ prompt: `Visa question: ${query}` }),
    });
    const data = await res.json();
    setResponse(data.answer);
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
      <button onClick={handleQuery} className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
        Ask AI
      </button>
      {response && <p className="mt-4 text-gray-600">{response}</p>}
    </div>
  );
}