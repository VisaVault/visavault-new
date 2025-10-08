'use client';
import React from 'react';

export default function Legal() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-semibold">Legal</h1>
      <div className="mt-6 space-y-6 max-w-3xl">
        <section className="card p-6">
          <h2 className="text-xl font-semibold">Disclaimer</h2>
          <p className="text-slate-700 mt-2 text-sm">
            Pop Immigration is not a law firm and does not provide legal advice. Our guided workflows and drafting tools are intended to help you
            prepare your application materials. For legal advice specific to your situation, consult a licensed immigration attorney.
          </p>
        </section>
        <section className="card p-6">
          <h2 className="text-xl font-semibold">Privacy</h2>
          <p className="text-slate-700 mt-2 text-sm">
            We take your privacy seriously. Uploaded documents are stored privately and access-controlled. You can request deletion at any time.
          </p>
        </section>
        <section className="card p-6">
          <h2 className="text-xl font-semibold">Terms</h2>
          <p className="text-slate-700 mt-2 text-sm">
            By using Pop Immigration, you agree to our Terms of Service, including acceptable use, refunds (where applicable), and fair usage of storage.
          </p>
        </section>
      </div>
    </div>
  );
}
