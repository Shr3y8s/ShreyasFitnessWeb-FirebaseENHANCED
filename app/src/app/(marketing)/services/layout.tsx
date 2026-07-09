import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Services & Pricing',
  description:
    'Personal training and coaching options — in-person, online, and hybrid. Find the plan that fits your goals, schedule, and budget.',
  path: '/services',
});

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
