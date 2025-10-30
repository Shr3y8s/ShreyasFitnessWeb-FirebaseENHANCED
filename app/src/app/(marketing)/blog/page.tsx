'use client';

import Link from 'next/link';

export default function BlogPage() {
  return (
    <>
      <style jsx>{`
        .page-header .container {
          text-align: left;
          max-width: 1000px;
          padding: 0 20px;
        }
        
        .page-header h1 {
          font-size: 2.8rem;
          margin-bottom: 20px;
          position: relative;
          display: inline-block;
        }
        
        .page-header h1:after {
          content: "";
          display: block;
          width: 80px;
          height: 3px;
          background-color: var(--primary);
          margin: 15px 0;
        }
        
        .header-subtitle {
          max-width: 800px;
          margin: 0;
          font-size: 1.1rem;
          line-height: 1.7;
          color: var(--dark-gray);
          font-weight: 400;
        }
        
        @media (max-width: 768px) {
          .page-header h1 {
            font-size: 2.2rem;
          }
          
          .header-subtitle {
            font-size: 1rem;
          }
        }
      `}</style>

      {/* Page Header */}
      <section className="page-header">
        <div className="container">
          <h1>Welcome to my <span style={{color: 'var(--primary)', fontWeight: 700}}>Fitness Journey</span> Blog!</h1>
          <p className="header-subtitle">Where I share evidence-based advice, practical tips, and motivational content to help you on your fitness journey. Whether you&apos;re just starting out or looking to take your fitness to the next level, you&apos;ll find valuable information here to support your goals.</p>
        </div>
      </section>

      {/* Featured Article */}
      <section className="featured-article">
        <div className="container">
          <div className="featured-article-content">
            <div className="featured-image">
              <div className="article-image-placeholder">
                <i className="fas fa-balance-scale"></i>
              </div>
              <span className="featured-tag">Featured</span>
            </div>
            <div className="featured-text">
              <span className="article-date">August 18, 2025</span>
              <h2>The 40/60 Rule: Why What You Do Outside the Gym Matters Most</h2>
              <p>What if I told you that your workouts—even the most intense ones—account for only about 40% of your results? After years of working with clients, I&apos;ve discovered that what you do during the other 23 hours of your day matters more than what you do during your workout hour.</p>
              <p>Learn how small daily choices about movement, food, and your environment have a greater impact on your fitness results than your workouts alone, and how to optimize the 60% that happens outside the gym.</p>
              <a href="/blogs/blog-forty-sixty-rule.html" className="btn-secondary">Read Full Article</a>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Articles */}
      <section className="blog-articles">
        <div className="container">
          <div className="blog-grid">
            <article className="blog-card">
              <div className="blog-image">
                <i className="fas fa-seedling"></i>
              </div>
              <div className="blog-content">
                <span className="article-date">July 26, 2025</span>
                <h3>The Control-First Approach Most Trainers Miss</h3>
                <p>Master control and proper form before chasing heavy weights. This approach builds better muscle connection, prevents injuries, and delivers superior results compared to the typical &quot;lift heavy&quot; mentality most trainers push.</p>
                <div className="blog-meta">
                  <div className="blog-categories">
                  </div>
                  <a href="/blogs/blog-control-first.html" className="btn-secondary">Read More</a>
                </div>
              </div>
            </article>

            <article className="blog-card">
              <div className="blog-image">
                <i className="fas fa-balance-scale"></i>
              </div>
              <div className="blog-content">
                <span className="article-date">June 24, 2025</span>
                <h3>Why I Never Let Clients Chase Numbers</h3>
                <p>Developing a strong mind-muscle connection is far more important than lifting heavy weights. Learn to feel each exercise in the target muscles rather than just moving weight from point A to point B.</p>
                <div className="blog-meta">
                  <div className="blog-categories">
                  </div>
                  <a href="/blogs/blog-mind-muscle.html" className="btn-secondary">Read More</a>
                </div>
              </div>
            </article>

            <article className="blog-card">
              <div className="blog-image">
                <i className="fas fa-calendar-check"></i>
              </div>
              <div className="blog-content">
                <span className="article-date">May 22, 2025</span>
                <h3>The Sustainable Approach I Learned After Years of Failure</h3>
                <p>Consistency with a &quot;good enough&quot; program you enjoy will always beat sporadic adherence to the &quot;perfect&quot; program you dread. Find workouts you actually look forward to rather than those that look impressive on paper.</p>
                <div className="blog-meta">
                  <div className="blog-categories">
                  </div>
                  <a href="/blogs/blog-sustainable-approach.html" className="btn-secondary">Read More</a>
                </div>
              </div>
            </article>
            
            <article className="blog-card">
              <div className="blog-image">
                <i className="fas fa-apple-alt"></i>
              </div>
              <div className="blog-content">
                <span className="article-date">April 20, 2025</span>
                <h3>The &apos;Less Is More&apos; Nutrition Framework</h3>
                <p>Simplify nutrition by focusing on a few key principles rather than complex rules. Prioritize protein, focus on whole foods, and follow the 80/20 rule for sustainable eating habits that don&apos;t require obsession.</p>
                <div className="blog-meta">
                  <div className="blog-categories">
                  </div>
                  <a href="/blogs/blog-nutrition-framework.html" className="btn-secondary">Read More</a>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
