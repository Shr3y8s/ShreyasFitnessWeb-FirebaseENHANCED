import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'FAQ',
  description:
    'Answers to common questions about training, coaching, pricing, scheduling, and how to get started with SHREY.FIT.',
  path: '/faq',
});

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
