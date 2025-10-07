'use client';
import React, { useState } from 'react';

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState<string>('');
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('English');

  async function startCheckout() {
    if (!file) { setMsg('Please choose a document.'); return; }
    setPending(true);
    setMsg(null);
    try {
      const response = await fetch('/api/stripe', {
        method: 'POST',
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_TRANSLATION_PRICE_ID || 'price_translation_49',
          metadata: { filename: file.name, note, targetLang },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Checkout failed');

      window.location.href = `/dashboard?session_id=${data.sessionId}`;
    } catch (e: any) {
      setMsg(e?.message || 'Network error');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-blue-900 mb-2">Translate a Document ($49)</h1>
      <p className="text-gray-600 mb-4">Certified translation via JukeLingo pipeline.</p>

      <div className="bg-white rounded-xl shadow p-6 space-y-3">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <select
          className="border rounded p-2"
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
        >
          <option>English</option>
          <option>Spanish</option>
          <option>Portuguese</option>
          <option>French</option>
          <option>German</option>
          <option>Chinese (Simplified)</option>
        </select>
        <textarea
          placeholder="Notes (country requirements, page formatting)"
          className="w-full p-2 border rounded"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          onClick={startCheckout}
          disabled={!file || pending}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {pending ? 'Starting checkout…' : 'Translate ($49)'}
        </button>
        {msg && <p className="text-red-600">{msg}</p>}
      </div>
    </main>
  );
}