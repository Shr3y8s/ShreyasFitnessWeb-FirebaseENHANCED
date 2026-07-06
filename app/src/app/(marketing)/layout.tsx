import { MarketingNav } from '@/components/MarketingNav';
import { Footer } from '@/components/Footer';

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

      <MarketingNav />
      {children}
      <Footer />
    </>
  );
}


