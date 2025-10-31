import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="marketing-content">
      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1>Real Fitness Results That Last</h1>
            <p>I get it. You&apos;ve tried the fad diets, the gym intimidation, the programs that promise everything. Let me show you the sustainable path I wish someone had shown me.</p>
            <div className="hero-buttons">
              <Link href="/connect#connect-options" className="btn-primary">Show Me How</Link>
              <Link href="/about" className="btn-secondary">My Story</Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="fitness-graphic">
              <i className="fas fa-dumbbell"></i>
              <div className="pulse-ring"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Emotion Section */}
      <section className="problem-section">
        <div className="container">
          <div className="problem-content">
            <div className="problem-split-layout">
              <div className="bold-statements">
                <h2 data-target="section-1">Tired of Empty Promises?</h2>
                <h3 data-target="section-2">Done with the BS?</h3>
                <h3 data-target="section-3">Ready for Real Change?</h3>
              </div>
              <div className="supporting-text">
                <p data-section="section-1" className="highlight-target">I understand how overwhelming the fitness journey can feel—especially when you&apos;re tired of programs that promise everything and deliver nothing. Whether you&apos;re hesitant to take that first step through the gym door or frustrated by plateaus despite your best efforts, I&apos;ve been there too.</p>
                
                <p data-section="section-2" className="highlight-target">Maybe you&apos;ve tried the fad diets, the &quot;30-day transformations,&quot; and the cookie-cutter routines that left you feeling more defeated than when you started. The confusion, the self-doubt, the intimidation—these are the real barriers that standard fitness advice rarely addresses.</p>
                
                <p data-section="section-3" className="highlight-target"><strong>If you&apos;re done with the BS and ready to make a lasting change that actually sticks, you&apos;ve found the right person.</strong> I specialize in working with beginners and those feeling stuck who are serious about doing this differently. Together, we&apos;ll cut through the noise and build a sustainable path forward that honors your unique challenges and celebrates every victory, no matter how small.</p>
                
                <p className="no-more-text"><em>No more quick fixes. No more empty promises. Just real results. You&apos;re not alone in this journey anymore.</em></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Actually Get */}
      <section className="featured-services">
        <div className="container">
          <div className="section-header">
            <h2>What You Actually Get</h2>
            <p>Not just another program - a completely different approach</p>
          </div>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-calendar-check"></i>
              </div>
              <h3>A Plan That Actually Fits Your Life</h3>
              <p>No more rigid schedules that fall apart after week 2. We&apos;ll build sustainable habits around your real life - work, family, and all.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-route"></i>
              </div>
              <h3>Someone Who&apos;s Walked Your Path</h3>
              <p>You won&apos;t get judgment here - just someone who remembers exactly how overwhelming this feels and knows the way forward.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>Results That Actually Last</h3>
              <p>No more crash diets or unsustainable routines. We focus on building habits that stick for life, not just Instagram photos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header">
            <h2>Success Stories from People Just Like You</h2>
            <p>Real transformations from people who were tired of starting over</p>
          </div>
          <div className="testimonial-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>&quot;I&apos;d tried everything - keto, CrossFit, personal trainers who didn&apos;t get it. Shreyas understood my struggles from day one. Finally, someone who didn&apos;t judge my past failures.&quot;</p>
              </div>
              <div className="testimonial-author">
                <div className="testimonial-avatar">
                  <i className="fas fa-user-circle"></i>
                </div>
                <div className="testimonial-info">
                  <h4>Sarah M.</h4>
                  <p>Lost 28 lbs in 4 months</p>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>&quot;I was honestly skeptical of another trainer promising &apos;different results.&apos; But Shreyas built a plan around my crazy work schedule and two kids. It actually stuck.&quot;</p>
              </div>
              <div className="testimonial-author">
                <div className="testimonial-avatar">
                  <i className="fas fa-user-circle"></i>
                </div>
                <div className="testimonial-info">
                  <h4>Mike T.</h4>
                  <p>Down 35 lbs and feeling strong</p>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>&quot;I felt so overwhelmed by all the conflicting fitness advice. Shreyas cut through the noise and showed me what actually works for busy people like me.&quot;</p>
              </div>
              <div className="testimonial-author">
                <div className="testimonial-avatar">
                  <i className="fas fa-user-circle"></i>
                </div>
                <div className="testimonial-info">
                  <h4>Jennifer L.</h4>
                  <p>Consistent for 8 months now</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
