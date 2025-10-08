import type { Metadata } from 'next';
import './globals.css';
import React from 'react';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Pop Immigration — Same-Day, Guided Visa & Green Card Workflows',
  description:
    'Pop Immigration provides guided workflows, affidavit drafting, smart checklists, document translations, mock interviews, and export-ready packets—same day.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="min-h-full bg-slate-50">
      <body className="min-h-screen text-slate-900">
        {/* Top Nav */}
        <header className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <span className="font-display text-xl font-semibold tracking-tight">Pop Immigration</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link className="hover:text-indigo-700" href="/">Home</Link>
              <Link className="hover:text-indigo-700" href="/start">Start</Link>
              <Link className="hover:text-indigo-700" href="/pricing">Pricing</Link>
              <Link className="hover:text-indigo-700" href="/forms">Forms</Link>
              <Link className="hover:text-indigo-700" href="/dashboard">Dashboard</Link>
              <Link className="hover:text-indigo-700" href="/contact">Contact</Link>
            </nav>
            <div className="md:hidden">
              <a href="/start" className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-white">Get started</a>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="mt-16 bg-white border-t border-slate-200">
          <div className="container mx-auto px-4 py-8 grid gap-6 md:grid-cols-4">
            <div>
              <div className="font-display text-lg font-semibold">Pop Immigration</div>
              <p className="text-sm text-slate-600 mt-2">
                Same-day, guided immigration workflows that save you time, money, and stress.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-2">Company</div>
              <ul className="space-y-1 text-sm">
                <li><a href="/about" className="hover:underline">About</a></li>
                <li><a href="/legal" className="hover:underline">Legal</a></li>
                <li><a href="/contact" className="hover:underline">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Product</div>
              <ul className="space-y-1 text-sm">
                <li><a href="/start" className="hover:underline">Start</a></li>
                <li><a href="/pricing" className="hover:underline">Pricing</a></li>
                <li><a href="/forms" className="hover:underline">Forms</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Support</div>
              <ul className="space-y-1 text-sm">
                <li><a href="mailto:support@popimmigration.com" className="hover:underline">support@popimmigration.com</a></li>
                <li><a href="mailto:contact@popimmigration.com" className="hover:underline">contact@popimmigration.com</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 text-xs text-slate-500 py-4">
            <div className="container mx-auto px-4">
              © {new Date().getFullYear()} Pop Immigration. All rights reserved.
            </div>
          </div>
        </footer>

        <Toaster position="top-right" />
      </body>
    </html>
  );
}

