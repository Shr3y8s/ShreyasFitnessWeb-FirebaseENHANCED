import { BlogPost, BlogSection, ProTip, KeyTakeaway, SummaryBox, PullQuote } from '@/components/blog/BlogPost';

export const metadata = {
  title: 'The 40/60 Rule: Why What You Do Outside the Gym Matters Most - SHREY.FIT',
  description: 'Your workouts account for only 40% of results. The other 60% comes from daily lifestyle choices.',
};

export default function FortySixtyRuleBlog() {
  const relatedPosts = [
    { href: '/blog/nutrition-framework', title: "The 'Less Is More' Nutrition Framework", description: 'Simplify your nutrition approach for better results.', icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { href: '/blog/sustainable-approach', title: 'The Sustainable Approach', description: 'Why consistency beats perfection.', icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { href: '/blog/control-first', title: 'Control-First Approach', description: 'Master control before chasing weights.', icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> }
  ];

  return (
    <BlogPost title="The 40/60 Rule: Why What You Do Outside the Gym Matters Most" date="August 18, 2025" prevPost={{ href: '/blog/nutrition-framework', title: 'Previous' }} relatedPosts={relatedPosts}>
      <p>When you think about fitness transformation, what comes to mind? For most people, it's intense workouts, sweat-drenched training sessions, and pushing to the limit in the gym. But what if I told you that your workouts—even the most intense ones—account for only about 40% of your results?</p>
      
      <p>After years of working with clients who were crushing their workouts but still not seeing the results they wanted, I've discovered a fundamental truth: what you do during the other 23 hours of your day matters more than what you do during your workout hour.</p>
      
      <PullQuote>"Your fitness results are built in the gaps between your workouts."</PullQuote>

      <BlogSection title="The 40/60 Rule" icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}>
        <SummaryBox><p>Your workouts only account for 40% of your results—the other 60% comes from your daily lifestyle choices. Small decisions about movement, food, and environment throughout your day have a greater impact than intense workouts alone.</p></SummaryBox>
        
        <p>Here's the truth that most fitness influencers won't tell you: your workouts account for only about 40% of your results. The other 60%? It's all about what you do during the other 23 hours of your day.</p>
        
        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">The Daily Choices That Actually Transform Your Body</h3>
        
        <h4 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Movement Decisions:</h4>
        <ul className="space-y-2">
          <li><strong>Stairs vs. elevators:</strong> This simple choice can add hundreds of steps to your day</li>
          <li><strong>Parking strategies:</strong> Choosing spots farther from entrances adds movement</li>
          <li><strong>Sitting alternatives:</strong> Standing desks, walking meetings, movement breaks</li>
        </ul>
        
        <h4 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Food Decisions:</h4>
        <ul className="space-y-2">
          <li><strong>Restaurant ordering:</strong> Learning to scan menus for better options</li>
          <li><strong>Grocery shopping patterns:</strong> How you navigate stores affects what ends up at home</li>
          <li><strong>Social eating strategies:</strong> Managing food choices during weekends and gatherings</li>
        </ul>
        
        <ProTip><p>One strategy I use with all my clients: the "1-mile rule"—for any destination under a mile away, commit to walking instead of driving. This one habit can add thousands of steps to your week.</p></ProTip>
        
        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">The Compounding Effect</h3>
        <p>Small daily decisions might seem insignificant in the moment, but they create dramatic differences over time:</p>
        <ul className="space-y-2">
          <li>Taking stairs instead of elevators burns 5-10 extra calories each time—multiplied over months, that's pounds of fat</li>
          <li>Swapping one sugary drink for water daily saves roughly 150 calories—that's 15 pounds per year</li>
          <li>Adding just 1,000 extra steps daily burns roughly 30,000 additional calories per year</li>
        </ul>
        
        <KeyTakeaway><p>Focus on the small daily choices that compound over time—taking stairs, walking more, making better food decisions. These matter more than your workouts alone.</p></KeyTakeaway>
      </BlogSection>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Mastering the 60%</h2>
      <p>Start by identifying just one or two small daily habits you could adjust. Perhaps it's taking the stairs at work, parking farther from store entrances, or swapping one daily sugary drink for water. Once these small changes become automatic, add another.</p>
      
      <p>Remember that fitness transformation isn't about heroic efforts—it's about consistent choices repeated day after day. By mastering the 60% that happens outside the gym, you'll build a foundation for lasting results.</p>
    </BlogPost>
  );
}
