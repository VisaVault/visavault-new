import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Script from 'next/script';
import React from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VisaVault - AI Immigration Tracker',
  description: 'Navigate H1B & Green Cards with AI – Updated for 2025 Fees',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-YOUR_GA_ID" />
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YOUR_GA_ID');
          `}
        </Script>
      </head>
      <body className={inter.className}>
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