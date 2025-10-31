import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'About Me - SHREY.FIT',
  description: 'Learn about Shreyas Annapureddy, NASM Certified Personal Trainer with 3+ years of experience specializing in sustainable weight loss and lifestyle coaching.',
};

export default function AboutPage() {
  return (
    <div className="marketing-content">
      {/* About Me Section */}
      <section className="about">
        <div className="container">
          <div className="about-content">
            <div className="about-image">
              <Image 
                src="/assets/Shreyas-profile.jpg" 
                alt="Shreyas Annapureddy - Personal Trainer" 
                className="trainer-photo"
                width={400}
                height={400}
              />
              <div className="trainer-name">
                <h1>Shreyas Annapureddy</h1>
                <p className="trainer-title">Personal Trainer & Fitness Coach</p>
              </div>
              <div className="social-links-container">
                <div className="social-links">
                  <a href="https://www.linkedin.com/in/shreyasannapureddy/" target="_blank" rel="noopener noreferrer" className="social-icon linkedin">
                    <i className="fab fa-linkedin-in"></i>
                  </a>
                  <a href="https://www.instagram.com/shreybeast" target="_blank" rel="noopener noreferrer" className="social-icon instagram">
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a href="#" className="social-icon facebook">
                    <i className="fab fa-facebook-f"></i>
                  </a>
                  <a href="#" className="social-icon youtube">
                    <i className="fab fa-youtube"></i>
                  </a>
                </div>
              </div>
            </div>
            <div className="about-text">
              <h3>Certified & Experienced</h3>
              
              <div className="credentials">
                <div className="credential expandable">
                  <i className="fas fa-certificate"></i>
                  <div className="credential-content">
                    <span>NASM Certified Personal Trainer</span>
                    <div className="credential-details">
                      <p>With my NASM Personal Trainer certification and recent BA degree, I bring both scientific knowledge and practical experience to help you achieve your fitness goals.</p>
                    </div>
                  </div>
                </div>
                <div className="credential expandable">
                  <i className="fas fa-dumbbell"></i>
                  <div className="credential-content">
                    <span>3+ Years Personal Training Experience</span>
                    <div className="credential-details">
                      <p>Specializing in sustainable weight loss transformations and lifestyle coaching. My approach focuses on lasting results through balanced nutrition and fitness routines that fit your real life.</p>
                    </div>
                  </div>
                </div>
                <div className="credential expandable">
                  <i className="fas fa-graduation-cap"></i>
                  <div className="credential-content">
                    <span>Bachelor of Arts in Media & Communications</span>
                    <div className="credential-details">
                      <p>Graduated from University of Washington</p>
                    </div>
                  </div>
                </div>
                <div className="credential expandable">
                  <i className="fas fa-book-medical"></i>
                  <div className="credential-content">
                    <span>Minor in Health Education and Promotion</span>
                    <div className="credential-details">
                      <p>Completed at University of Washington</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="specialization-highlight">
                <p>Having personally overcome the challenges of weight loss and fitness plateaus, I <span className="highlight-text">understand the mental and emotional aspects</span> of lasting change that most trainers overlook.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* My Transformation Story */}
      <section className="transformation">
        <div className="container">
          <div className="section-header">
            <h2>My Transformation Story</h2>
            <p>Why I understand your journey better than most</p>
          </div>
          
          <div className="story-container">
            <div className="story-highlight">
              <div className="quote-mark"><i className="fas fa-quote-left"></i></div>
              <p className="highlight-text">I don&apos;t just want to train you for an hour. I want to offer you a better life.</p>
            </div>
            
            <div className="story-content">
              <p className="story-intro">I used to be that person who avoided the gym because I felt like I didn&apos;t belong there. Five years ago, I was over 100 pounds overweight, struggling with my health, and convinced that fitness was for &apos;other people&apos; - not someone like me.</p>
              
              <p>Through my own transformation journey, I discovered that the real barriers to lasting change aren&apos;t physical - they&apos;re mental and emotional. I learned that successful weight loss isn&apos;t about perfect nutrition or killer workouts (though those help). It&apos;s about understanding your relationship with food, building confidence, and creating systems that work with your real life, not against it.</p>
              
              <div className="emphasis-block">
                <p>Today, I&apos;m not just a trainer - I&apos;m someone who&apos;s walked in your shoes.</p>
              </div>
              
              <p>I understand the frustration of trying program after program without lasting results. I know what it&apos;s like to feel judged, overwhelmed, and ready to give up. But I also know that transformation is possible, because I&apos;ve lived it.</p>
              
              <p>My approach isn&apos;t about crushing you with brutal workouts or restrictive diets. It&apos;s about teaching you sustainable habits, building your confidence, and giving you the tools to succeed long after our sessions end. My favorite thing to tell clients is: <span className="highlight-text">&apos;If I do my job properly, you won&apos;t need me anymore.&apos;</span> Because my goal isn&apos;t to keep you dependent - it&apos;s to help you become the healthiest, happiest version of yourself.</p>
            </div>
          </div>
        </div>
      </section>

      {/* My Philosophy */}
      <section className="philosophy">
        <div className="container">
          <div className="section-header">
            <h2>My Philosophy</h2>
            <p>The principles that guide my approach to fitness training</p>
          </div>
          <div className="philosophy-grid">
            <div className="philosophy-item">
              <div className="philosophy-icon">
                <i className="fas fa-balance-scale"></i>
              </div>
              <h3>Balance</h3>
              <p>Fitness should enhance your life, not consume it. I believe in creating sustainable fitness programs that fit seamlessly into your lifestyle.</p>
            </div>
            <div className="philosophy-item">
              <div className="philosophy-icon">
                <i className="fas fa-bullseye"></i>
              </div>
              <h3>Personalization</h3>
              <p>No two bodies are the same. Your fitness program should be as unique as you are, tailored to your goals, preferences, and needs.</p>
            </div>
            <div className="philosophy-item">
              <div className="philosophy-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>Progress</h3>
              <p>Consistent, measured progress is the key to long-term success. I focus on helping you achieve sustainable results over time.</p>
            </div>
            <div className="philosophy-item">
              <div className="philosophy-icon">
                <i className="fas fa-brain"></i>
              </div>
              <h3>Education</h3>
              <p>Understanding the &quot;why&quot; behind your workouts is essential. I empower you with knowledge so you can make informed decisions about your fitness.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Begin Your Transformation?</h2>
            <p>Let&apos;s work together to achieve your fitness goals through personalized training and expert guidance.</p>
            <div className="cta-buttons">
              <Link href="/connect" className="btn-primary">Get in Touch</Link>
              <Link href="/services" className="btn-secondary">View Services</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
