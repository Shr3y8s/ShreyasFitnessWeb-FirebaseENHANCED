import { BlogPost, BlogSection, ProTip, KeyTakeaway, SummaryBox, PullQuote } from '@/components/blog/BlogPost';

export const metadata = {
  title: "The 'Less Is More' Nutrition Framework - SHREY.FIT",
  description: 'Simplify nutrition by focusing on key principles. The 80/20 rule for sustainable eating.',
};

export default function NutritionFrameworkBlog() {
  const relatedPosts = [
    { href: '/blog/sustainable-approach', title: 'The Sustainable Approach', description: 'Why consistency beats perfection.', icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { href: '/blog/forty-sixty-rule', title: 'The 40/60 Rule', description: 'Daily habits matter more than workouts.', icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg> },
    { href: '/blog/control-first', title: 'Control-First Approach', description: 'Master control before chasing weights.', icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> }
  ];

  return (
    <BlogPost title="The 'Less Is More' Nutrition Framework" date="April 20, 2025" prevPost={{ href: '/blog/sustainable-approach', title: 'Previous' }} nextPost={{ href: '/blog/forty-sixty-rule', title: 'Next' }} relatedPosts={relatedPosts}>
      <p>If you've ever tried to improve your nutrition, you've likely encountered the overwhelming complexity of modern diet advice. Macros, micros, meal timing, supplements—it's enough to make anyone give up before they even begin.</p>
      
      <PullQuote>"The nutrition approach that works best isn't the one that's theoretically 'perfect'—it's the one you can actually follow consistently."</PullQuote>

      <BlogSection title="The 'Less Is More' Nutrition Framework" icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}>
        <SummaryBox><p>Simplify nutrition by focusing on a few key principles. Prioritize protein, focus on whole foods, and follow the 80/20 rule for sustainable eating habits.</p></SummaryBox>
        
        <p>Most trainers overcomplicate nutrition to the point where clients feel overwhelmed and eventually give up. My approach is radically different because I've learned that simplicity leads to consistency.</p>
        
        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">My Minimalist Approach</h3>
        <ul className="space-y-2">
          <li><strong>Protein prioritization:</strong> A palm-sized portion at each meal improves body composition</li>
          <li><strong>Food quality over quantity:</strong> Focusing on whole, minimally processed foods</li>
          <li><strong>Strategic flexibility:</strong> Planning for "imperfect" meals prevents the restrict-binge cycle</li>
          <li><strong>Hydration as foundation:</strong> Proper water intake improves everything</li>
        </ul>
        
        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">The 80/20 Principle</h3>
        <ul className="space-y-2">
          <li>Focus on making 80% of food choices support your goals</li>
          <li>Allow 20% flexibility for enjoyment and social situations</li>
          <li>This prevents psychological fatigue from trying to be "perfect"</li>
        </ul>
        
        <ProTip><p>The nutrition approach that works best isn't the one that's theoretically "perfect"—it's the one you can actually follow consistently.</p></ProTip>
        
        <KeyTakeaway><p>Focus on simple, sustainable nutrition habits. The 80/20 rule creates lasting results without mental fatigue.</p></KeyTakeaway>
      </BlogSection>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Simplicity Is the Ultimate Sophistication</h2>
      <p>Start by focusing on just one or two principles—perhaps prioritizing protein at each meal and increasing water intake. Once these become habits, you can gradually add more layers.</p>
    </BlogPost>
  );
}
