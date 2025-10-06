import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Script from 'next/script';
import React from 'react';

export const metadata: Metadata = {
  title: 'VisaVault - AI Immigration Tracker',
  description: 'Navigate H1B & Green Cards with AI – Updated for 2025 Fees',
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="font-sans">
        <nav className="bg-blue-900 text-white p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">🛂 VisaVault</h1>
          <a href="/dashboard" className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-800">Dashboard</a>
        </nav>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}