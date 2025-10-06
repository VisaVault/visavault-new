import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VisaVault - AI Immigration Tracker',
  description: 'Navigate H1B & Green Cards with AI – Updated for 2025 Fees',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-blue-900 text-white p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">🛂 VisaVault</h1>
          <a href="/dashboard" className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-800">Dashboard</a>
        </nav>
        {children}
      </body>
    </html>
  );
}