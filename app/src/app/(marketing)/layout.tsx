import { MarketingNav } from '@/components/MarketingNav';
import { Footer } from '@/components/Footer';
import Script from 'next/script';

export const metadata = {
  title: 'SHREY.FIT - Personal Training & Coaching',
  description: 'Your certified fitness professional dedicated to helping you achieve your goals through personalized training and coaching.',
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      <link rel="stylesheet" href="/css/styles.css" />
      <link rel="stylesheet" href="/css/blog.css" />
      
      <MarketingNav />
      {children}
      <Footer />
      
      <Script src="/js/script.js" strategy="afterInteractive" />
    </>
  );
}
