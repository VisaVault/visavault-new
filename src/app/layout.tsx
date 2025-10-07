import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Script from 'next/script';
import React from 'react';

export const metadata: Metadata = {
  title: 'VisaForge - AI Immigration Concierge',
  description: 'Automated USCIS forms, affidavits, translations, and interview prep with AI.',
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}</Script>
          </>
        )}
      </head>
      <body className="font-sans">
        <nav className="bg-blue-900 text-white p-4 flex justify-between items-center">
          <a href="/" className="text-xl font-bold">🛂 VisaForge</a>
          <div className="flex gap-3">
            <a href="/forms" className="px-3 py-1 rounded hover:bg-blue-800">Forms</a>
            <a href="/mock-interview" className="px-3 py-1 rounded hover:bg-blue-800">Interview</a>
            <a href="/translate" className="px-3 py-1 rounded hover:bg-blue-800">Translate</a>
            <a href="/dashboard" className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-800">Dashboard</a>
          </div>
        </nav>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
