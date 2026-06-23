import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sports Cards Collector',
  description: 'Manage your sports card collection virtually',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
