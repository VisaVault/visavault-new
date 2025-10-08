'use client';
import React, { useState } from 'react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', topic: 'General', message: '' });
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function submit() {
    setPending(true); setErr(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to send');
      setSent(true);
    } catch (e: any) {
      setErr(e.message || 'Failed to send');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        <div>
          <div className="badge">We’re here to help</div>
          <h1 className="font-display text-4xl font-semibold mt-3">Contact Pop Immigration</h1>
          <p className="text-slate-700 mt-3">
            Whether you’re starting your case, exploring partnerships, or press inquiries—we’d love to hear from you.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="font-semibold">Direct emails</div>
            <ul className="text-sm text-slate-700 mt-2 space-y-1">
              <li>• General: <a className="underline" href="mailto:contact@popimmigration.com">contact@popimmigration.com</a></li>
              <li>• Partnerships: <a className="underline" href="mailto:partnerships@popimmigration.com">partnerships@popimmigration.com</a></li>
              <li>• Press: <a className="underline" href="mailto:press@popimmigration.com">press@popimmigration.com</a></li>
              <li>• Support: <a className="underline" href="mailto:support@popimmigration.com">support@popimmigration.com</a></li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold">Send us a message</div>

          {sent ? (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
              Thanks! We received your message and we’ll get back the same day.
            </div>
          ) : (
            <>
              <div className="grid gap-3 mt-4">
                <input
                  name="name"
                  type="text"
                  placeholder="Your name"
                  value={form.name}
                  onChange={onChange}
                  className="w-full p-2 border rounded-md"
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Your email"
                  value={form.email}
                  onChange={onChange}
                  className="w-full p-2 border rounded-md"
                />
                <select
                  name="topic"
                  value={form.topic}
                  onChange={onChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option>General</option>
                  <option>Partnerships</option>
                  <option>Press</option>
                  <option>Support</option>
                </select>
                <textarea
                  name="message"
                  placeholder="How can we help?"
                  value={form.message}
                  onChange={onChange}
                  className="w-full p-2 border rounded-md min-h-[120px]"
                />
                <button
                  onClick={submit}
                  disabled={pending || !form.email || !form.message}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {pending ? 'Sending…' : 'Send message'}
                </button>
                {err && <div className="text-red-600 text-sm">{err}</div>}
              </div>
            </>
          )}

          <div className="text-xs text-slate-500 mt-4">
            By contacting us, you agree to our Terms and Privacy in <a className="underline" href="/legal">Legal</a>.
          </div>
        </div>
      </div>
    </div>
  );
}
