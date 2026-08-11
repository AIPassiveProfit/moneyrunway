import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Money Runway',
  description:
    'Know exactly what is safe to spend today, after bills, debt, savings and taxes are covered.',
  applicationName: 'Money Runway',
};

export const viewport: Viewport = {
  themeColor: '#102a43',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
