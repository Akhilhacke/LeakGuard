import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeakGuard AI',
  description: 'Prevent Catastrophic Leaks Before Pushing to Production.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white antialiased min-h-screen selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  );
}
