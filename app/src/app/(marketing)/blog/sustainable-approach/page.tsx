import { BlogPost, BlogSection, ProTip, KeyTakeaway, SummaryBox, PullQuote } from '@/components/blog/BlogPost';

export const metadata = {
  title: 'The Sustainable Approach I Learned After Years of Failure - SHREY.FIT',
  description: 'Consistency with a program you enjoy beats sporadic adherence to the perfect program.',
};

export default function SustainableApproachBlog() {
  const relatedPosts = [
    { href: '/blog/control-first', title: 'The Control-First Approach Most Trainers Miss', description: 'Learn why mastering control before chasing heavy weights leads to better results.', icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    { href: '/blog/mind-muscle', title: 'Why I Never Let Clients Chase Numbers', description: 'Learn why the mind-muscle connection is more important than the weight on the bar.', icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
    { href: '/blog/forty-sixty-rule', title: 'The 40/60 Rule', description: 'Discover why your daily habits matter more than your workouts.', icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg> }
  ];

  return (
    <BlogPost title="The Sustainable Approach I Learned After Years of Failure" date="May 22, 2025" prevPost={{ href: '/blog/mind-muscle', title: 'Previous' }} nextPost={{ href: '/blog/nutrition-framework', title: 'Next' }} relatedPosts={relatedPosts}>
      <p>I spent years jumping from one "perfect" workout program to another, always convinced that the next one would finally deliver the results I wanted. I'd start each new program with enthusiasm, only to abandon it a few weeks later when life got in the way or when I simply couldn't maintain the rigid schedule it demanded.</p>
      
      <PullQuote>"The 'perfect' workout program that you hate doing is completely worthless."</PullQuote>

      <BlogSection title="The Sustainable Approach" icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}>
        <SummaryBox><p>Consistency with a "good enough" program you enjoy will always beat sporadic adherence to the "perfect" program you dread. Find workouts you actually look forward to.</p></SummaryBox>
        
        <p>Here's a truth most trainers won't admit: the "perfect" workout program that you hate doing is completely worthless. I learned this the hard way through my own fitness journey.</p>
        
        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">Why Consistency Beats Everything Else</h3>
        <ul className="space-y-2">
          <li>A mediocre program followed consistently outperforms the "perfect" program followed sporadically</li>
          <li>Most people quit not because their program doesn't work, but because it doesn't fit their life</li>
          <li>The psychological benefits of consistent small wins far outweigh occasional intense sessions</li>
        </ul>
        
        <ProTip><p>When clients tell me they "don't enjoy exercise," I've found it's almost always because they haven't found the right approach. Some thrive with group classes, others with solo training, some with outdoor activities, others with home workouts.</p></ProTip>
        
        <KeyTakeaway><p>Find exercise you enjoy and can maintain consistently. A sustainable approach you stick with will always outperform the "perfect" program you abandon after two weeks.</p></KeyTakeaway>
      </BlogSection>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Finding Your Sustainable Path</h2>
      <p>Start by asking yourself: "What type of movement do I actually look forward to?" The best exercise program is the one you'll do consistently, not the one that looks most impressive on paper.</p>
    </BlogPost>
  );
}
