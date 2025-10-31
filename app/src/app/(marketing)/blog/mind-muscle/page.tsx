import { BlogPost, BlogSection, ProTip, KeyTakeaway, SummaryBox, PullQuote } from '@/components/blog/BlogPost';

export const metadata = {
  title: 'Why I Never Let Clients Chase Numbers - SHREY.FIT',
  description: 'Developing a strong mind-muscle connection is far more important than lifting heavy weights.',
};

export default function MindMuscleBlog() {
  const relatedPosts = [
    {
      href: '/blog/control-first',
      title: 'The Control-First Approach Most Trainers Miss',
      description: 'Learn why mastering control before chasing heavy weights leads to better results.',
      icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    },
    {
      href: '/blog/sustainable-approach',
      title: 'The Sustainable Approach I Learned After Years of Failure',
      description: 'Why consistency with a program you enjoy beats perfection every time.',
      icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    },
    {
      href: '/blog/nutrition-framework',
      title: "The 'Less Is More' Nutrition Framework",
      description: 'Simplify your nutrition approach for better, sustainable results.',
      icon: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    }
  ];

  return (
    <BlogPost 
      title="Why I Never Let Clients Chase Numbers"
      date="June 24, 2025"
      prevPost={{ href: '/blog/control-first', title: 'Previous' }}
      nextPost={{ href: '/blog/sustainable-approach', title: 'Next' }}
      relatedPosts={relatedPosts}
    >
      <p>Walk into any gym, and you'll hear the same conversations: "How much do you bench?" or "I just hit a new PR on squats." The fitness industry has conditioned us to believe that progress is measured primarily by the numbers on the weight plates. But after years of training clients and transforming my own physique, I've discovered a truth that contradicts this common belief.</p>
      
      <p>The weight on the bar matters far less than how you're lifting it. This realization has completely transformed my approach to training clients, especially beginners who are still developing their foundation.</p>

      <PullQuote>
        "The weight on the bar matters far less than how you're lifting it."
      </PullQuote>

      <BlogSection 
        title="The Mind-Muscle Connection"
        icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
      >
        <SummaryBox>
          <p>Developing a strong mind-muscle connection is far more important than lifting heavy weights. Learn to feel each exercise in the target muscles rather than just moving weight from point A to point B.</p>
        </SummaryBox>

        <p>Here's something most trainers won't tell you: the weight on the bar matters far less than how you're lifting it. I've seen countless clients come to me after years of training elsewhere with impressive numbers but underdeveloped physiques and chronic injuries.</p>

        <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">The Mind-Muscle Connection Most Trainers Ignore</h3>
        <p>In my approach, I focus on something that's rarely taught properly: the mind-muscle connection. This isn't just fitness jargon—it's the difference between:</p>
        <ul className="space-y-2">
          <li>Just "going through the motions" versus truly engaging target muscles</li>
          <li>Developing a balanced physique versus overdeveloping certain muscle groups while neglecting others</li>
          <li>Building functional strength versus just improving numbers on specific exercises</li>
          <li>Training that feels purposeful versus workouts that feel like a chore</li>
        </ul>

        <ProTip>
          <p>One technique I use with all my clients: during each rep, mentally say the name of the muscle you're targeting. This simple practice dramatically improves mind-muscle connection and prevents your workout from becoming mindless movement.</p>
        </ProTip>

        <KeyTakeaway>
          <p>The mind-muscle connection is your secret weapon. Learn to mentally engage with each rep rather than mindlessly moving through exercises.</p>
        </KeyTakeaway>
      </BlogSection>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Quality Over Quantity: A Better Path Forward</h2>
      <p>If you've been measuring your progress solely by how much weight you can lift, I encourage you to try a different approach. For your next few workouts, reduce the weight by 30-40% and focus entirely on feeling the target muscles work throughout each repetition.</p>
      
      <p>You might be surprised to discover muscles you didn't even know you were supposed to be using. This is the beginning of developing a true mind-muscle connection—the foundation of effective training that delivers lasting results.</p>
    </BlogPost>
  );
}
