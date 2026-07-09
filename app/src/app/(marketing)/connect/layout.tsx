import type { Metadata } from 'next';
import { pageMetadata, personalTrainerServiceJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = pageMetadata({
  title: 'Connect',
  description:
    'Book a free consultation with coach Shrey. Ask questions, share your goals, and find the right training or coaching fit.',
  path: '/connect',
});

export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Person + ProfessionalService structured data on the primary conversion page. */}
      <JsonLd data={personalTrainerServiceJsonLd()} />
      {children}
    </>
  );
}


