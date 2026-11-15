import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CareConnect — Collaborative Elderly Healthcare Platform',
  description: 'Shared care circle and today companion for elderly healthcare management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
