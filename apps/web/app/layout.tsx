import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/app-shell/app-shell';
import { appEnv } from '@/config/env';

export const metadata: Metadata = {
  title: `${appEnv.appName} Web`,
  description:
    'Frontend modulith scaffold for the public hub, producer dashboard, and platform admin surfaces.',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
