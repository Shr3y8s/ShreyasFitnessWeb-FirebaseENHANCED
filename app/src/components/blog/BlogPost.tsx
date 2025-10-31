import Link from 'next/link';
import Image from 'next/image';
import { ReactNode } from 'react';

interface BlogPostProps {
  title: string;
  date: string;
  children: ReactNode;
  nextPost?: { href: string; title: string };
  prevPost?: { href: string; title: string };
  relatedPosts: Array<{
    href: string;
    title: string;
    description: string;
    icon: ReactNode;
  }>;
}

export function BlogPost({ title, date, children, nextPost, prevPost, relatedPosts }: BlogPostProps) {
  return (
    <>
      {/* Blog Post Header */}
      <header className="blog-post-header">
        <div className="container">
          <h1>{title}</h1>
          <div className="blog-post-meta">
            <div className="author">
              <div className="author-avatar">
                <Image
                  src="/assets/Shreyas-profile.jpg"
                  alt="Shreyas Annapureddy"
                  width={40}
                  height={40}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <span>By Shreyas Annapureddy</span>
            </div>
            <div className="date">
              <i className="far fa-calendar-alt"></i>
              <span>{date}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Blog Post Content */}
      <div className="blog-post-content">
        {children}

        {/* Post Navigation */}
        <div className="post-navigation">
          {prevPost ? (
            <div className="nav-previous">
              <Link href={prevPost.href}>
                <i className="fas fa-chevron-left"></i>
                <span>Previous Article</span>
              </Link>
            </div>
          ) : <div></div>}
          
          {nextPost && (
            <div className="nav-next">
              <Link href={nextPost.href}>
                <span>Next Article</span>
                <i className="fas fa-chevron-right"></i>
              </Link>
            </div>
          )}
        </div>

        {/* Related Posts */}
        <div className="related-posts">
          <h3>Related Articles</h3>
          <div className="related-posts-grid">
            {relatedPosts.map((post, index) => (
              <div key={index} className="related-post-card">
                <Link href={post.href}>
                  <div className="related-post-image">
                    {post.icon}
                  </div>
                  <div className="related-post-content">
                    <h4>{post.title}</h4>
                    <p>{post.description}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function BlogSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="tip-section">
      <div className="tip-header">
        <div className="tip-icon">
          {icon}
        </div>
        <h2 className="tip-title">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function ProTip({ children }: { children: ReactNode }) {
  return (
    <div className="pro-tip-box">
      <h4><i className="fas fa-lightbulb"></i> Pro Tip</h4>
      {children}
    </div>
  );
}

export function KeyTakeaway({ children }: { children: ReactNode }) {
  return (
    <div className="key-takeaway">
      <h4><i className="fas fa-check-circle"></i> Key Takeaway</h4>
      {children}
    </div>
  );
}

export function SummaryBox({ children }: { children: ReactNode }) {
  return (
    <div className="summary-box">
      <h4><i className="fas fa-star"></i> In a Nutshell</h4>
      {children}
    </div>
  );
}

export function PullQuote({ children }: { children: ReactNode }) {
  return (
    <div className="pull-quote">
      {children}
    </div>
  );
}
