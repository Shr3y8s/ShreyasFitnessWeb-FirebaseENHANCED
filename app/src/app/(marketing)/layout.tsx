import { MarketingNav } from '@/components/MarketingNav';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/seo/JsonLd';
import { organizationJsonLd, webSiteJsonLd } from '@/lib/seo';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Site-wide structured data for search engines. */}
      <JsonLd data={[organizationJsonLd(), webSiteJsonLd()]} />

      <MarketingNav />
      {children}
      <Footer />
    </>
  );
}



