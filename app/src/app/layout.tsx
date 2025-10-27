import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { CoachUpdatesProvider } from '@/context/CoachUpdatesContext';

export const metadata: Metadata = {
  title: 'SHREY.FIT',
  description: 'Personal Training & Fitness Coaching',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CoachUpdatesProvider>
            {children}
          </CoachUpdatesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
