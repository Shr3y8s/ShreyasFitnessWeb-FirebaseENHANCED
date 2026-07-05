'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ServicesPage() {
  useEffect(() => {
    // Modal functionality
    const modalButtons = document.querySelectorAll('.details-modal-btn');
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.modal-close');
    
    // Open modal
    modalButtons.forEach(button => {
      button.addEventListener('click', () => {
        const modalId = button.getAttribute('data-modal');
        if (modalId) {
          const modal = document.getElementById(modalId);
          if (modal) {
            modal.classList.add('active');
          }
        }
      });
    });
    
    // Close modal
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        modals.forEach(modal => modal.classList.remove('active'));
      });
    });
    
    // Close on outside click
    modals.forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
    
    // Missing toggle functionality
    const missingToggles = document.querySelectorAll('.missing-toggle');
    missingToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const container = toggle.closest('.missing-container');
        const content = container?.querySelector('.missing-content');
        const span = toggle.querySelector('span');
        const icon = toggle.querySelector('i');
        
        if (content && span && icon) {
          const isExpanded = toggle.getAttribute('data-expanded') === 'true';
          
          if (isExpanded) {
            content.classList.add('missing-section-collapsed');
            span.textContent = 'Show';
            icon.className = 'fas fa-chevron-down';
            toggle.setAttribute('data-expanded', 'false');
          } else {
            content.classList.remove('missing-section-collapsed');
            span.textContent = 'Hide';
            icon.className = 'fas fa-chevron-up';
            toggle.setAttribute('data-expanded', 'true');
          }
        }
      });
    });
    
    // Cleanup
    return () => {
      modalButtons.forEach(button => {
        button.removeEventListener('click', () => {});
      });
    };
  }, []);
  
  return (
    <div className="marketing-content">
      <link rel="stylesheet" href="/css/services.css" />
      
      {/* Services Introduction */}
      <section className="about">
        <div className="container">
          <div className="section-header">
            <h1>SHREY.FIT Services</h1>
            <p>Three tailored service options designed to fit your fitness needs and goals.</p>
          </div>
          <div className="service-tiers">
            {/* Tier 1: In-Person Training Sessions */}
            <div className="service-tier">
              <div className="service-card-item">
                <div className="service-card-badge training-badge">Training Only</div>
                <div className="service-card-icon">
                  <i className="fas fa-dumbbell"></i>
                </div>
                <h3 className="service-card-title">In-Person Training</h3>
                <p className="service-card-tagline">Get expert 1-on-1 guidance</p>
                <div className="service-card-price">$75<span>/session</span></div>
                <p className="service-card-desc">Expert in-person coaching sessions focused on technique, form, and effective workouts tailored to your goals. <strong>Includes essential SHREY.FIT app access</strong> &mdash; book &amp; buy sessions, message your coach, and manage billing (full coaching features are Online/Complete only).</p>
                <span className="service-card-format">Seattle Area Only</span>
                <div className="card-action-buttons">
                  <button className="btn-secondary details-modal-btn" data-modal="personalDetailsModal">Learn More</button>
                  <Link href="/connect" className="btn-primary basic-btn">Book Your First Session</Link>
                </div>
              </div>
            </div>
            
            {/* Tier 2: Online Coaching */}
            <div className="service-tier">
              <div className="service-card-item membership-card">
                <div className="service-card-badge">Most Convenient</div>
                <div className="service-card-icon">
                  <i className="fas fa-laptop"></i>
                </div>
                <h3 className="service-card-title">Online Coaching</h3>
                <p className="service-card-tagline">Train smart and eat right from anywhere</p>
                <div className="service-card-price">$200<span>/month</span></div>
                <p className="service-card-desc">A complete remote system - a custom program refreshed every 2 weeks, real nutrition coaching, a monthly strategy call, video form analysis, and direct support to keep you progressing on your own terms. <strong>Includes full SHREY.FIT app access.</strong></p>
                <span className="service-card-format">Remote Coaching</span>
                <div className="card-action-buttons">
                  <button className="btn-secondary details-modal-btn" data-modal="transformationDetailsModal">Learn More</button>
                  <Link href="/connect" className="btn-primary">Start Your Transformation</Link>
                </div>
              </div>
            </div>
            
            {/* Tier 3: Complete Transformation */}
            <div className="service-tier">
              <div className="service-card-item elite-card">
                <div className="service-card-badge elite-badge">Best Value</div>
                <div className="service-card-icon">
                  <i className="fas fa-crown"></i>
                </div>
                <h3 className="service-card-title">Complete Transformation</h3>
                <p className="service-card-tagline">My highest level of support &mdash; we solve your puzzle together</p>
                <div className="service-card-price">$250<span>/month</span></div>
                <p className="service-card-desc">Everything in Online Coaching, plus the hands-on guidance, real-world skills, and direct access that don&apos;t just get you results &mdash; they teach you to keep them for life. <strong>Includes full SHREY.FIT app access.</strong> Locked-in $60 in-person rate as a bonus.</p>
                <span className="service-card-format">Remote + Seattle In-Person Bonus</span>
                <div className="card-action-buttons">
                  <button className="btn-secondary details-modal-btn" data-modal="eliteDetailsModal">Learn More</button>
                  <Link href="/connect" className="btn-primary elite-btn">Go Premium</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform / Command Center Section */}
      <section className="platform-section">
        <div className="container">
          <div className="section-header">
            <div className="platform-eyebrow">More than a coach</div>
            <h2>Your Entire Fitness Command Center</h2>
          </div>
          <p className="platform-intro">
            <strong>Most trainers run on Google Docs and spreadsheets.</strong> I built you a real app &mdash; everything in one place, fully interactive, and made for how clients and coaches actually work.
          </p>
          <div className="platform-grid">
            <div className="platform-feature">
              <div className="platform-icon"><i className="fas fa-clipboard-list"></i></div>
              <h4>Your Plan, Live</h4>
              <p>Training &amp; nutrition protocol, your vision and current focus &mdash; always up to date.</p>
            </div>
            <div className="platform-feature">
              <div className="platform-icon"><i className="fas fa-dumbbell"></i></div>
              <h4>Interactive Workouts</h4>
              <p>Log every set &amp; rep, watch exercise demos, and check off completed workouts.</p>
            </div>
            <div className="platform-feature">
              <div className="platform-icon"><i className="fas fa-apple-alt"></i></div>
              <h4>Nutrition Hub</h4>
              <p>Meal plans, macro tracking, a daily habit tracker, and easy-to-follow guides.</p>
            </div>
            <div className="platform-feature">
              <div className="platform-icon"><i className="fas fa-chart-line"></i></div>
              <h4>Progress Analytics</h4>
              <p>Body composition, strength trends, and workout history &mdash; visualized over time.</p>
            </div>
            <div className="platform-feature">
              <div className="platform-icon"><i className="fas fa-bullseye"></i></div>
              <h4>Goals &amp; Milestones</h4>
              <p>Set targets, track milestones, and unlock achievements as you progress.</p>
            </div>
            <div className="platform-feature">
              <div className="platform-icon"><i className="fas fa-camera"></i></div>
              <h4>Photos &amp; Weekly Survey</h4>
              <p>Track the visual change and tell me how you&apos;re really doing each week.</p>
            </div>
            <div className="platform-feature">
              <div className="platform-icon"><i className="fas fa-calendar-check"></i></div>
              <h4>Book Workouts &amp; Check-ins</h4>
              <p>Schedule your 1-on-1 sessions and weekly check-ins right inside the app.</p>
            </div>
            <div className="platform-feature">
              <div className="platform-icon"><i className="fas fa-comments"></i></div>
              <h4>Direct Coach Chat</h4>
              <p>Message me anytime, with everything about your plan in one thread.</p>
            </div>
            <div className="platform-feature">
              <div className="platform-icon"><i className="fas fa-credit-card"></i></div>
              <h4>Billing &amp; Membership</h4>
              <p>Buy sessions, manage your subscription, and view invoices &mdash; all self-service.</p>
            </div>
          </div>
          <p className="platform-note"><i className="fas fa-circle-info"></i> Full platform access is included with <strong>Online Coaching</strong> and <strong>Complete Transformation</strong>. <strong>In-Person Training</strong> includes essential app access &mdash; booking, coach chat, and billing.</p>
        </div>
      </section>

      {/* Tier Comparison Chart */}
      <section className="comparison-chart-section">
        <div className="container">
          <div className="section-header">
            <h2>Compare All Three Options</h2>
            <p>See exactly what you get at every level &mdash; and why most clients choose Complete Transformation</p>
          </div>

          <div className="comparison-chart-scroll">
            <table className="comparison-chart">
              <thead>
                <tr>
                  <th className="cc-feature-col">What You Get</th>
                  <th className="cc-tier-col">
                    <span className="cc-tier-name">In-Person Training</span>
                    <span className="cc-tier-price">$75<small>/session</small></span>
                  </th>
                  <th className="cc-tier-col">
                    <span className="cc-tier-name">Online Coaching</span>
                    <span className="cc-tier-price">$200<small>/month</small></span>
                  </th>
                  <th className="cc-tier-col cc-best">
                    <span className="cc-best-badge">Best Value</span>
                    <span className="cc-tier-name">Complete Transformation</span>
                    <span className="cc-tier-price">$250<small>/month</small></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="cc-feature">SHREY.FIT Platform Access <span className="cc-seattle">(full client app)</span></td>
                  <td className="cc-cell"><span className="cc-partial"><i className="fas fa-check"></i> Essentials</span><br /><span className="cc-sub cc-sub-partial">Book sessions, coach chat &amp; billing</span></td>
                  <td className="cc-cell"><span className="cc-inc"><i className="fas fa-check"></i> Full access</span></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> <strong>Full access</strong></span></td>
                </tr>
                <tr>
                  <td className="cc-feature">Custom Training Program</td>
                  <td className="cc-cell">&mdash;</td>
                  <td className="cc-cell"><span className="cc-inc"><i className="fas fa-check"></i> Every 2 weeks</span></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> <strong>Continuously adapted</strong></span></td>
                </tr>
                <tr>
                  <td className="cc-feature">Nutrition Coaching</td>
                  <td className="cc-cell">&mdash;</td>
                  <td className="cc-cell"><span className="cc-inc"><i className="fas fa-check"></i> Every 2 weeks</span></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> <strong>Continuously adapted</strong></span></td>
                </tr>
                <tr>
                  <td className="cc-feature">Progress Check-Ins</td>
                  <td className="cc-cell"><span className="cc-inc"><i className="fas fa-check"></i> In session</span></td>
                  <td className="cc-cell"><span className="cc-inc"><i className="fas fa-check"></i> Every 2 weeks</span></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> <strong>Weekly</strong></span></td>
                </tr>
                <tr>
                  <td className="cc-feature">Messaging Support</td>
                  <td className="cc-cell">&mdash;</td>
                  <td className="cc-cell"><span className="cc-inc"><i className="fas fa-check"></i> Within 24 hrs</span></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> <strong>Priority &middot; same day</strong></span></td>
                </tr>
                <tr>
                  <td className="cc-feature">Video Form Analysis</td>
                  <td className="cc-cell">&mdash;</td>
                  <td className="cc-cell"><span className="cc-inc"><i className="fas fa-check"></i> Included</span></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> Included</span></td>
                </tr>
                <tr>
                  <td className="cc-feature">Real-World Skills Coaching <span className="cc-seattle">(eat out, shop, travel, social events)</span></td>
                  <td className="cc-cell cc-no"><i className="fas fa-times"></i></td>
                  <td className="cc-cell cc-no"><i className="fas fa-times"></i></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> Included</span></td>
                </tr>
                <tr>
                  <td className="cc-feature">Train-Anywhere Fundamentals</td>
                  <td className="cc-cell"><span className="cc-inc"><i className="fas fa-check"></i> In session</span></td>
                  <td className="cc-cell cc-no"><i className="fas fa-times"></i></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> Included</span></td>
                </tr>
                <tr>
                  <td className="cc-feature">Mindset &amp; Lifestyle Coaching</td>
                  <td className="cc-cell">&mdash;</td>
                  <td className="cc-cell cc-no"><i className="fas fa-times"></i></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> Included</span></td>
                </tr>
                <tr>
                  <td className="cc-feature">1-on-1 Strategy Call</td>
                  <td className="cc-cell">&mdash;</td>
                  <td className="cc-cell"><span className="cc-inc"><i className="fas fa-check"></i> Monthly</span></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> <strong>Monthly + as-needed</strong></span></td>
                </tr>
                <tr>
                  <td className="cc-feature">Habit &amp; Accountability</td>
                  <td className="cc-cell">&mdash;</td>
                  <td className="cc-cell"><span className="cc-partial"><i className="fas fa-check"></i> Tracker only</span><br /><span className="cc-sub cc-sub-partial">self-guided in app</span></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> <strong>Full 1-on-1 coaching</strong></span></td>
                </tr>
                <tr>
                  <td className="cc-feature">In-Person Check-In Meetings <span className="cc-seattle">(Seattle &middot; FaceTime if remote)</span></td>
                  <td className="cc-cell">&mdash;</td>
                  <td className="cc-cell cc-no"><i className="fas fa-times"></i></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> <strong>Included</strong></span></td>
                </tr>
                <tr>
                  <td className="cc-feature">In-Person Training Sessions <span className="cc-seattle">(Seattle)</span></td>
                  <td className="cc-cell">$75/session</td>
                  <td className="cc-cell cc-no"><i className="fas fa-times"></i></td>
                  <td className="cc-cell cc-best"><span className="cc-inc"><i className="fas fa-check"></i> <strong>$60/session</strong></span><br /><span className="cc-sub">best rate anywhere</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Two next-step lanes: pre-sale questions vs. ready-to-buy */}
          <div className="next-step-cards">
            <div className="next-step-card">
              <div className="next-step-icon"><i className="fas fa-circle-question"></i></div>
              <div className="next-step-body">
                <h4>Still deciding?</h4>
                <p>Have a question about the options or not sure which fits? Book a free intro call &mdash; no commitment, just clarity.</p>
                <Link href="/connect" className="next-step-btn next-step-btn-outline">Book a free intro call <i className="fas fa-arrow-right"></i></Link>
              </div>
            </div>
            <div className="next-step-card next-step-card-primary">
              <div className="next-step-icon"><i className="fas fa-rocket"></i></div>
              <div className="next-step-body">
                <h4>Ready to begin?</h4>
                <p>Pick your plan and get instant access. Right after, you&apos;ll book a free setup call in your dashboard where we map out your personalized plan together.</p>
                <Link href="/signup" className="next-step-btn next-step-btn-solid">Get started <i className="fas fa-arrow-right"></i></Link>
              </div>
            </div>
          </div>
          <p className="comparison-chart-note"><i className="fas fa-location-dot" style={{color: '#999', marginRight: '6px'}}></i>Online coaching is available worldwide. In-person sessions are available in the Seattle area only.</p>
        </div>
      </section>


      {/* Why Most People Never See Results - Empathy Intro */}
      <section className="empathy-section">
        <div className="container">
          <div className="empathy-block">
            <div className="empathy-eyebrow">The real reason</div>
            <h2>Why most people never see results &mdash; and why it&apos;s not your fault</h2>
            <div className="empathy-grid">
              <div className="empathy-col empathy-problem">
                <span className="empathy-tag empathy-tag-bad"><i className="fas fa-circle-xmark"></i> What goes wrong</span>
                <p>You&apos;ve been handed the &quot;perfect&quot; meal plan and workout before &mdash; and still fell off. The truth no one tells you: you can&apos;t flip years of habits overnight.</p>
                <p>Most trainers assume you already have skills you were never taught, then blame you when the plan doesn&apos;t stick.</p>
              </div>
              <div className="empathy-col empathy-solution">
                <span className="empathy-tag empathy-tag-good"><i className="fas fa-circle-check"></i> How I do it differently</span>
                <p>I&apos;ve been over 100 pounds heavier myself, and I had to completely rewire how I think about food and training.</p>
                <p>So I meet you exactly where you are &mdash; not where some &quot;perfect plan&quot; assumes you should be &mdash; and we build the skills together, one realistic step at a time, so the change actually lasts.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Three-Tier Approach Section */}
      <section className="approach-section">
        <div className="container">
          <div className="section-header">
            <h2>The Right Approach For Your Fitness Journey</h2>
            <p>Whatever your starting point, there is a fit &mdash; and most clients quickly find that one option simply gives the most.</p>
          </div>
          <div className="approach-benefits">
            <div className="approach-benefit">
              <div className="approach-icon">
                <i className="fas fa-user"></i>
              </div>
              <h3>Hands-On Training</h3>
              <p className="approach-persona">Best for you if&hellip;</p>
              <p>You&apos;re local to Seattle, you learn best in person, and you want to nail your technique and build real confidence in the gym &mdash; on your own schedule.</p>
            </div>
            <div className="approach-benefit">
              <div className="approach-icon">
                <i className="fas fa-laptop"></i>
              </div>
              <h3>The Full Remote System</h3>
              <p className="approach-persona">Best for you if&hellip;</p>
              <p>You&apos;re self-motivated and want a proven plan plus expert support you can run from anywhere, on your own schedule.</p>
            </div>
            <div className="approach-benefit">
              <div className="approach-popular">Most Popular</div>
              <div className="approach-icon">
                <i className="fas fa-crown"></i>
              </div>
              <h3>The One Most Clients Choose</h3>
              <p className="approach-persona">Best for you if&hellip;</p>
              <p>You&apos;ve started and stalled before. You don&apos;t just want a plan &mdash; you want me in your corner, teaching you the real-world skills so the results finally stick for good.</p>
            </div>
          </div>

          {/* My Promise Callout */}
          <div className="my-promise">
            <i className="fas fa-handshake my-promise-watermark" aria-hidden="true"></i>
            <div className="my-promise-left">
              <div className="my-promise-badge"><i className="fas fa-handshake"></i> My Promise</div>
              <h3>I don&apos;t create dependence &mdash; I build independence.</h3>
            </div>
            <div className="my-promise-right">
              <p>My goal is to teach you the skills to stay in shape on your own &mdash; so your results last for life, not just while we work together. Most coaches overcomplicate food and training so you stay dependent on them; I do the opposite.</p>
              <p>You&apos;ll learn how to order at any restaurant, train in any gym, and handle a vacation or a night out without losing your progress. Diets are temporary structure &mdash; the skills I teach are for life, long after you stop needing a coach.</p>
            </div>
          </div>

          <div className="approach-note">
            <p>Every option is tailored to you, and you can upgrade anytime &mdash; but Complete Transformation gives you the most room to grow from day one.</p>
          </div>
        </div>
      </section>

      {/* Value Comparison Section */}
      <section className="value-comparison-section" id="value-comparison-section">
        <div className="container">
          <div className="section-header">
            <h2>Why Our Services Are Your Best Investment</h2>
            <p>See how much Complete Transformation would cost if you bought every piece separately</p>
          </div>
          
          <div className="value-cards-container">
            {/* Coffee Comparison Card */}
            <div className="value-card coffee-comparison">
              <div className="value-card-header">
                <i className="fas fa-mug-hot"></i>
                <h3>Less Than Your Daily Coffee</h3>
              </div>
              <div className="value-comparison-table">
                <div className="comparison-row">
                  <div className="comparison-item">
                    <span className="comparison-label"><i className="fas fa-coffee"></i> Starbucks Latte:</span>
                  </div>
                  <div className="comparison-value">
                    <span className="price-tag">$5.50</span><span className="price-period">/day</span>
                  </div>
                </div>
                <div className="comparison-row highlighted">
                  <div className="comparison-item">
                    <span className="comparison-label"><i className="fas fa-laptop"></i> Complete Transformation:</span>
                  </div>
                  <div className="comparison-value">
                    <span className="price-tag">$8.33</span><span className="price-period">/day</span>
                  </div>
                </div>
              </div>
              <div className="value-card-footer">
                <p>For less than $9/day, get your entire fitness solution</p>
              </div>
            </div>

            {/* Value Breakdown Card */}
            <div className="value-card value-breakdown" id="savings-comparison-table">
              <div className="value-card-header">
                <i className="fas fa-tags"></i>
                <h3>Complete Transformation vs. Typical Fitness Coaching</h3>
              </div>
              <div className="value-comparison-table">
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <tbody>
                    <tr style={{borderBottom: '1px solid #f0f0f0', fontWeight: 600}}>
                      <td style={{padding: '12px 10px'}}>Service Feature</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>SHREY.FIT</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}>Bought Separately</td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>Custom Training Programs</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$175</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>Nutrition Coaching</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$200</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>Real-World Skills &amp; Lifestyle Coaching</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$150</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>Weekly Progress Check-Ins</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$150</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>Habit &amp; Accountability Coaching</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$120</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>Monthly 1-on-1 Strategy Call</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$100</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>Anytime Priority Messaging</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$99</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>Video Form Analysis</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$125</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>In-Person Check-In Meetings</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$180</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '2px dashed #e0e0e0', backgroundColor: '#f9f9f9', fontWeight: 600}}>
                      <td style={{padding: '14px 10px'}}>Coaching Value Total</td>
                      <td style={{padding: '14px 10px', textAlign: 'center', color: 'var(--primary-dark)'}}><span className="price-tag">$250</span><span className="price-period">/mo</span></td>
                      <td style={{padding: '14px 10px', textAlign: 'right'}}><span className="price-tag">$1,299</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{backgroundColor: 'rgba(76, 175, 80, 0.2)'}}>
                      <td style={{padding: '14px 10px', fontWeight: 600, color: 'var(--primary-dark)'}}>You Save Every Month</td>
                      <td style={{padding: '14px 10px', textAlign: 'center'}}></td>
                      <td style={{padding: '14px 10px', textAlign: 'right', fontWeight: 700}}><span className="price-tag" style={{color: '#00b300', fontSize: '1.3rem'}}>$1,049</span></td>
                    </tr>
                    <tr style={{backgroundColor: 'rgba(255, 193, 7, 0.18)'}}>
                      <td style={{padding: '14px 10px', fontWeight: 600}} colSpan={3}>
                        <i className="fas fa-gift" style={{color: '#f0a500', marginRight: '6px'}}></i>
                        And on top of all that &mdash; a locked-in <strong>$60</strong> in-person training rate (Seattle), below the $75 walk-in. The coaching alone already pays for itself; this is just the cherry on top.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Consultation Popup */}
      <div id="consultation-popup" className="consultation-popup">
        <div className="popup-content">
          <span className="popup-close">&times;</span>
          <div className="consultation-icon">
            <i className="fas fa-comments"></i>
          </div>
          <h3>Not Sure Which Option Is Right For You?</h3>
          <p>Schedule a free consultation to discuss your goals and find your perfect fitness solution.</p>
          <div className="popup-buttons">
            <Link href="/connect" className="btn-primary popup-btn">Schedule Free Consultation</Link>
          </div>
        </div>
      </div>

      {/* Service Detail Modals */}
      {/* In-Person Training Details Modal */}
      <div id="personalDetailsModal" className="modal details-modal training-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>In-person Training Sessions</h2>
            <span className="modal-close">&times;</span>
          </div>
          <div className="modal-body">
            <p>Expert in-person coaching sessions focused on technique, form, and effective workouts tailored specifically to your unique goals, fitness level, and lifestyle. These sessions are perfect for those who want hands-on guidance without requiring comprehensive nutrition or lifestyle coaching.</p>
            
            <div className="modal-price-callout">
              <div className="modal-price">$75<span>/session</span></div>
              <p>4-session pack available: $260 ($65/session)</p>
            </div>
            
            <h3>What&apos;s Included:</h3>
            <ul className="modal-features">
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Expert 1-on-1 Coaching</strong>
                  <p>Personalized attention and guidance throughout your entire training session</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Form Correction & Technique</strong>
                  <p>Hands-on technique guidance and safety instruction to maximize results and prevent injury</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Personalized Session Programming</strong>
                  <p>Each session designed specifically for your body, goals, and fitness level</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Equipment Guidance</strong>
                  <p>Learn how to properly use equipment for maximum effectiveness and safety</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Essential App Access</strong>
                  <p>Your own SHREY.FIT account to book &amp; buy sessions, message your coach anytime, and manage billing &mdash; all in one place (full coaching features are Online/Complete only)</p>
                </div>
              </li>
            </ul>
            
            <div className="missing-container">
              <h3>What You&apos;re Missing:</h3>
              <button className="missing-toggle" data-expanded="false">
                <span>Show</span> <i className="fas fa-chevron-down"></i>
              </button>
              <div className="missing-content missing-section-collapsed">
                <ul className="modal-features fomo-features">
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Custom Training Programs</strong>
                      <p>Updated monthly based on your progress, feedback, and available equipment</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Complete Nutrition Coaching</strong>
                      <p>Personalized meal plans and dietary guidance to support your fitness goals</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Unlimited Messaging Support</strong>
                      <p>Direct access with 24-hour response guarantee for questions and guidance</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="modal-format-section">
              <h4>Available Format:</h4>
              <div className="modal-format-badges">
                <span className="modal-format-badge">In-Person</span>
              </div>
              <p>In-person sessions available in the Seattle area only.</p>
            </div>
            
            <div className="modal-upgrade">
              <h4>Ready for More?</h4>
              <p>Many clients start with In-Person Training and upgrade to Complete Transformation within 30 days for more comprehensive results.</p>
            </div>
            
            <div className="modal-social-proof">
              <blockquote>&quot;Great starting point - I learned proper form quickly and saw immediate improvement in my strength.&quot;</blockquote>
            </div>
            
            <div className="modal-cta">
              <Link href="/connect" className="btn-primary basic-btn">Book Your First Session</Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Online Coaching Details Modal */}
      <div id="transformationDetailsModal" className="modal details-modal standard-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Online Coaching</h2>
            <span className="modal-close">&times;</span>
          </div>
          <div className="modal-body">
            <p>Your complete remote coaching system - everything you need to train smart and eat right from anywhere. A custom program refreshed every two weeks, real nutrition coaching, a monthly 1-on-1 strategy call, and direct access to me so you always know your next move.</p>
            
            <div className="modal-price-callout">
              <div className="modal-price">$200<span>/month</span></div>
              <p>Just ~$6.67 per day for a complete remote coaching system</p>
            </div>
            
            <h3>What&apos;s Included:</h3>
            <ul className="modal-features">
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Your Coaching &amp; Accountability Command Center</strong>
                  <p>Full access to the SHREY.FIT app &mdash; your live plan, interactive workouts, nutrition hub, progress analytics, goals, check-ins, and direct coach chat, all in one place</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Custom Training Program</strong>
                  <p>Personalized exercise plans refreshed every two weeks based on your progress, goals, and available equipment</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Nutrition Coaching</strong>
                  <p>A personalized nutrition plan adjusted every two weeks so you always know exactly how to eat for your goals</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Bi-Weekly Progress Check-Ins</strong>
                  <p>A structured review every two weeks to track progress and fine-tune your program</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Monthly 1-on-1 Strategy Call</strong>
                  <p>A dedicated video call each month to plan ahead, solve roadblocks, and keep you accountable</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Direct Messaging Support</strong>
                  <p>Message me directly with questions and check-ins, with replies typically within 24 hours</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Video Form Analysis</strong>
                  <p>Submit workout videos for detailed technique feedback and exercise modifications</p>
                </div>
              </li>
            </ul>
            
            <div className="missing-container">
              <h3>What You&apos;re Missing:</h3>
              <button className="missing-toggle" data-expanded="false">
                <span>Show</span> <i className="fas fa-chevron-down"></i>
              </button>
              <div className="missing-content missing-section-collapsed">
                <ul className="modal-features fomo-features">
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Weekly Progress Check-Ins</strong>
                      <p>Complete Transformation reviews your progress every week instead of every two weeks - faster adjustments, faster results</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Priority Same-Day Messaging</strong>
                      <p>Skip the line with priority responses (typically same day) instead of standard 48-hour replies</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Continuously Adapted Programming</strong>
                      <p>Your plan is adjusted whenever your body, schedule, or life changes - not just once a month</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Real-World Skills Coaching</strong>
                      <p>Learn how to eat out, shop, travel, and handle a night out with friends while still hitting your goals - the skills that keep you in shape for life</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Train-Anywhere Fundamentals</strong>
                      <p>Master the fundamentals of movement so you can build an effective workout in any gym, park, or hotel - and never be lost or dependent again</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Mindset &amp; Lifestyle Coaching</strong>
                      <p>The mental side most coaches skip - rewiring how you think about food and training so the change actually sticks</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>As-Needed 1-on-1 Calls</strong>
                      <p>Online includes a monthly strategy call - Complete adds extra as-needed calls whenever you hit a roadblock</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Hands-On Habit &amp; Accountability Coaching</strong>
                      <p>Online Coaching includes the self-guided habit tracker in the app &mdash; Complete adds me actively coaching your daily habits and holding you accountable, not just handing you the tracker</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>In-Person Check-In Meetings (Included)</strong>
                      <p>Sit down with me to talk through how you&apos;re feeling and any roadblocks - in person in Seattle, or over FaceTime anywhere else</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Locked-In $60 In-Person Rate</strong>
                      <p>Train with me in person at the best rate available anywhere - below the $75 walk-in and the $260 four-pack</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="modal-format-section">
              <h4>Available Format:</h4>
              <div className="modal-format-badges">
                <span className="modal-format-badge">Remote</span>
              </div>
              <p>This service is delivered remotely to serve you anywhere in the world.</p>
            </div>
            
            <div className="modal-upgrade">
              <h4>Want Even Better Results?</h4>
              <p>For just $50 more, Complete Transformation upgrades you to weekly check-ins, anytime priority support, a monthly 1-on-1 strategy call, real-world skills &amp; mindset coaching, and included in-person check-in meetings - and adds a locked-in $60 in-person rate as a bonus.</p>
            </div>
            
            <div className="modal-social-proof">
              <blockquote>&quot;The Online Coaching package completely changed my approach to fitness. Having both training and nutrition support made all the difference.&quot;</blockquote>
            </div>
            
            <div className="modal-cta">
              <Link href="/connect" className="btn-primary">Start Your Transformation</Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Complete Transformation Details Modal */}
      <div id="eliteDetailsModal" className="modal details-modal elite-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Complete Transformation</h2>
            <span className="modal-close">&times;</span>
          </div>
          <div className="modal-body">
            <p>My highest level of support - we solve your puzzle together. You get everything in Online Coaching, upgraded, plus the real-world skills and one-on-one access that don&apos;t just get you results - they teach you to keep them for life. My job isn&apos;t to keep you dependent on me; it&apos;s to make myself unnecessary. And as a bonus, you lock in my best-ever in-person rate.</p>
            
            <div className="modal-price-callout">
              <div className="modal-price">$250<span>/month</span></div>
              <p>Just ~$8.33 per day - only ~$1.67 more than Online Coaching for everything below</p>
            </div>
            
            <div className="value-highlight elite">
              <div className="value-highlight-header">Premium Package:</div>
              <div className="value-highlight-body">Our most comprehensive solution for maximum results</div>
            </div>
            
            <div className="value-highlight elite">
              <div className="value-highlight-header">Value:</div>
              <div className="value-highlight-body"><a href="#value-comparison-section" className="savings-link">See how Complete Transformation saves you nearly $1,000/month vs. buying it all separately! →</a></div>
            </div>
            
            <h3>What&apos;s Included:</h3>
            <ul className="modal-features">
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Your Full Coaching &amp; Accountability Command Center</strong>
                  <p>The complete SHREY.FIT app experience &mdash; live plan, interactive workouts, nutrition hub, progress analytics, goals, weekly check-ins, and priority coach chat, all in one place</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Everything in Online Coaching</strong>
                  <p>Your custom training program, nutrition coaching, direct messaging, and video form analysis - all included as the foundation</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Weekly Progress Check-Ins</strong>
                  <p>A structured review every single week (not every two) so we adjust faster and you progress faster</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Priority Same-Day Messaging</strong>
                  <p>Front-of-the-line responses, typically the same day, whenever you have a question or need a quick adjustment</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Continuously Adapted Programming</strong>
                  <p>Your plan evolves whenever your body, schedule, or life changes - not just once a month</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>1-on-1 Strategy Calls (Monthly + As-Needed)</strong>
                  <p>Your monthly strategy call, plus extra as-needed calls whenever you hit a roadblock - so you&apos;re never stuck waiting</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Habit &amp; Accountability Coaching</strong>
                  <p>A structured behavior-change system that builds the daily habits that actually create lasting results</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Real-World Skills Coaching</strong>
                  <p>The skills most coaching skips: how to order at a restaurant, shop a grocery store, travel, and enjoy a night out with friends while still hitting your goals - in person in Seattle, or over FaceTime anywhere else</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Train-Anywhere Fundamentals</strong>
                  <p>Master the fundamentals of movement so you can build an effective workout in any gym, park, or hotel - never lost, never dependent on a machine or a once-a-week session</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Mindset &amp; Lifestyle Coaching</strong>
                  <p>The mental side that actually drives results - I&apos;ve lost over 100 pounds and rewired how I think about food and training, so I help you do the same from where you are now</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>In-Person Check-In Meetings (Included)</strong>
                  <p>Sit down with me to talk through how you&apos;re feeling, wins, and roadblocks - beyond your regular check-ins and workouts. In person in Seattle, or over FaceTime anywhere else</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Priority Support &amp; Scheduling</strong>
                  <p>Preferential booking times and the fastest response to everything you need</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>BONUS: Locked-In $60 In-Person Rate</strong>
                  <p>Train with me in person at $60/session - my best rate anywhere, below the $75 walk-in and the $260 four-pack ($65/session). Seattle area only.</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>BONUS: In-Person Progress Assessments</strong>
                  <p>Hands-on measurements and form correction during your in-person sessions for precise feedback</p>
                </div>
              </li>
            </ul>
            
            <div className="missing-container">
              <h3>What You&apos;re Missing:</h3>
              <button className="missing-toggle" data-expanded="false">
                <span>Show</span> <i className="fas fa-chevron-down"></i>
              </button>
              <div className="missing-content missing-section-collapsed">
                <ul className="modal-features fomo-features">
                  <li>
                    <i className="fas fa-check" style={{color: '#00b300'}}></i>
                    <div>
                      <strong>Nothing!</strong>
                      <p>This is our most comprehensive package with everything included</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-check" style={{color: '#00b300'}}></i>
                    <div>
                      <strong>Maximum Results</strong>
                      <p>Get the best of both worlds: remote guidance plus in-person accountability</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-check" style={{color: '#00b300'}}></i>
                    <div>
                      <strong>Complete Support System</strong>
                      <p>Our premium tier delivers the ultimate fitness experience with no compromises</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="modal-format-section">
              <h4>Available Format:</h4>
              <div className="modal-format-badges">
                <span className="modal-format-badge">Remote + In-Person</span>
              </div>
              <p>Remote coaching available worldwide, in-person sessions available in the Seattle area only.</p>
            </div>
            
            <div className="modal-social-proof">
              <blockquote>&quot;The combination of online coaching and in-person sessions gave me the perfect balance of accountability and flexibility. This is the ultimate fitness experience.&quot;</blockquote>
            </div>
            
            <div className="modal-cta">
              <Link href="/connect" className="btn-primary elite-btn">Go Premium</Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* ===== Platform / Command Center ===== */
        .platform-section {
          padding: 60px 0 20px;
        }
        .platform-eyebrow {
          display: inline-block;
          color: #4CAF50;
          font-weight: 700;
          font-size: 0.78rem;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .platform-intro {
          max-width: 640px;
          margin: 4px auto 0;
          text-align: center;
          color: #555;
          font-size: 1.05rem;
          line-height: 1.7;
        }
        .platform-intro strong { color: #1f2d1f; }
        .platform-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          max-width: 1100px;
          margin: 30px auto 0;
        }
        .platform-feature {
          background: #fff;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 22px 22px 20px;
          transition: all 0.25s ease;
        }
        .platform-feature:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 22px rgba(0,0,0,0.08);
          border-color: rgba(76,175,80,0.4);
        }
        .platform-icon {
          width: 46px;
          height: 46px;
          border-radius: 10px;
          background: rgba(76,175,80,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .platform-icon i { color: #4CAF50; font-size: 1.2rem; }
        .platform-feature h4 {
          margin: 0 0 6px;
          font-size: 1.05rem;
          font-weight: 700;
          color: #1f2d1f;
        }
        .platform-feature p {
          margin: 0;
          color: #666;
          font-size: 0.92rem;
          line-height: 1.55;
        }
        .platform-note {
          text-align: center;
          margin: 28px auto 0;
          max-width: 760px;
          color: #555;
          font-size: 0.92rem;
          background: rgba(76,175,80,0.06);
          border-radius: 10px;
          padding: 14px 18px;
        }
        .platform-note i { color: #4CAF50; margin-right: 6px; }
        @media (max-width: 900px) {
          .platform-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .platform-grid { grid-template-columns: 1fr; }
        }

        /* ===== Comparison chart: included cell (check + text) ===== */
        .cc-inc {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          color: #2e7d32;
        }
        .cc-inc i {
          color: #00b300;
          font-size: 0.8rem;
        }

        /* ===== Comparison chart: "Essentials" partial-access cell (amber) ===== */
        .cc-partial {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          color: #b26a00;
          font-weight: 600;
        }
        .cc-partial i {
          color: #f0a500;
          font-size: 0.8rem;
        }
        .cc-sub-partial {
          color: #b26a00;
        }

        /* ===== Next-step lanes (below comparison chart) ===== */
        .next-step-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          max-width: 1000px;
          margin: 28px auto 0;
        }
        .next-step-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          background: #fff;
          border: 1px solid #e6e6e6;
          border-radius: 14px;
          padding: 24px;
          text-align: left;
          box-shadow: 0 4px 16px rgba(0,0,0,0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .next-step-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 26px rgba(0,0,0,0.09);
        }
        .next-step-card-primary {
          border-color: rgba(76,175,80,0.5);
          background: linear-gradient(135deg, #f1faf1 0%, #ffffff 60%);
        }
        .next-step-icon {
          flex-shrink: 0;
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: rgba(76,175,80,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .next-step-icon i { color: #4CAF50; font-size: 1.2rem; }
        .next-step-body { flex: 1; }
        .next-step-body h4 {
          margin: 0 0 6px;
          font-size: 1.15rem;
          font-weight: 700;
          color: #1f2d1f;
        }
        .next-step-body p {
          margin: 0 0 16px;
          color: #666;
          font-size: 0.92rem;
          line-height: 1.6;
        }
        .next-step-btn {
          display: inline-block;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .next-step-btn-outline {
          background: #fff;
          color: #2e7d32;
          border: 2px solid #4CAF50;
        }
        .next-step-btn-outline:hover {
          background: rgba(76,175,80,0.08);
        }
        .next-step-btn-solid {
          background: linear-gradient(135deg, #4CAF50, #2E7D32);
          color: #fff;
          border: 2px solid transparent;
        }
        .next-step-btn-solid:hover {
          box-shadow: 0 6px 16px rgba(76,175,80,0.35);
          transform: translateY(-1px);
        }
        @media (max-width: 700px) {
          .next-step-cards { grid-template-columns: 1fr; gap: 14px; }
        }

        /* ===== Mobile: horizontal-scroll for wide tables + swipe hint ===== */
        @media (max-width: 768px) {
          /* Big value-breakdown table scrolls sideways instead of squishing */
          .value-comparison-table {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .value-comparison-table table {
            min-width: 460px;
          }
          /* "Swipe" hint above scrollable tables so users know to scroll */
          .comparison-chart-scroll::before,
          .value-breakdown .value-comparison-table::before {
            content: "← swipe to compare →";
            display: block;
            text-align: center;
            font-size: 0.72rem;
            font-weight: 600;
            letter-spacing: 0.4px;
            color: #4CAF50;
            padding: 6px 0 8px;
          }
        }

        /* ===== Small phones: full-width next-step buttons ===== */
        @media (max-width: 480px) {
          .next-step-card { padding: 20px; }
          .next-step-btn {
            display: block;
            width: 100%;
            text-align: center;
          }
        }


        /* ===== Empathy Intro ===== */
        .empathy-section {
          padding: 60px 0 20px;
        }
        .empathy-block {
          max-width: 960px;
          margin: 0 auto;
          background: #fff;
          border-radius: 16px;
          padding: 40px 40px 44px;
          box-shadow: 0 6px 24px rgba(0,0,0,0.06);
          border-top: 4px solid #4CAF50;
        }
        .empathy-eyebrow {
          display: inline-block;
          color: #4CAF50;
          font-weight: 700;
          font-size: 0.78rem;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .empathy-block h2 {
          font-size: 1.75rem;
          color: #1f2d1f;
          margin-bottom: 28px;
          line-height: 1.25;
          max-width: 760px;
        }
        .empathy-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }
        .empathy-col {
          text-align: left;
          padding: 22px 24px;
          border-radius: 12px;
        }
        .empathy-problem {
          background: #fbf4f4;
          border-left: 4px solid #e57373;
        }
        .empathy-solution {
          background: #f1f8f2;
          border-left: 4px solid #4CAF50;
        }
        .empathy-tag {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-weight: 700;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .empathy-tag-bad { color: #d9534f; }
        .empathy-tag-good { color: #2e7d32; }
        .empathy-col p {
          color: #555;
          font-size: 1rem;
          line-height: 1.7;
          margin-bottom: 12px;
        }
        .empathy-col p:last-child { margin-bottom: 0; }

        /* ===== Approach card persona + popular ribbon ===== */
        .approach-persona {
          color: #9c27b0 !important;
          font-weight: 700;
          font-size: 0.8rem !important;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .approach-benefit:nth-child(1) .approach-persona { color: #3F51B5 !important; }
        .approach-benefit:nth-child(2) .approach-persona { color: var(--primary) !important; }
        /* Allow the "Most Popular" ribbon to sit above the card without clipping */
        .approach-benefits { overflow: visible; padding-top: 14px; }
        .approach-benefit {
          position: relative;
          overflow: visible;
        }
        .approach-popular {
          position: absolute;
          top: -13px;
          left: 50%;
          transform: translateX(-50%);
          background: #9c27b0;
          color: #fff;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 5px 16px;
          border-radius: 999px;
          white-space: nowrap;
          box-shadow: 0 3px 8px rgba(156,39,176,0.3);
          z-index: 5;
        }

        /* ===== My Promise Callout ===== */
        .my-promise {
          max-width: 960px;
          margin: 48px auto 10px;
          background: linear-gradient(135deg, #1f2d1f 0%, #2e7d32 100%);
          color: #fff;
          border-radius: 16px;
          padding: 40px;
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 36px;
          align-items: center;
          box-shadow: 0 10px 30px rgba(46,125,50,0.25);
          position: relative;
          overflow: hidden;
        }
        .my-promise-watermark {
          position: absolute;
          right: -8px;
          bottom: -28px;
          font-size: 9rem;
          color: rgba(255,255,255,0.07);
          pointer-events: none;
          z-index: 0;
        }
        .my-promise-left { position: relative; z-index: 1; }
        .my-promise-badge {
          display: inline-block;
          background: rgba(255,255,255,0.16);
          color: #fff;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 5px 14px;
          border-radius: 999px;
          margin-bottom: 16px;
        }
        .my-promise-badge i { margin-right: 6px; }
        .my-promise h3 {
          font-size: 1.6rem;
          margin: 0;
          line-height: 1.3;
          color: #fff;
        }
        .my-promise-right { position: relative; z-index: 1; }
        .my-promise-right p {
          color: rgba(255,255,255,0.92);
          font-size: 1rem;
          line-height: 1.7;
          margin: 0 0 14px;
        }
        .my-promise-right p:last-child { margin-bottom: 0; }
        @media (max-width: 768px) {
          .empathy-grid { grid-template-columns: 1fr; gap: 18px; }
          .my-promise { grid-template-columns: 1fr; gap: 20px; padding: 32px 26px; }
        }
        @media (max-width: 600px) {
          .empathy-block { padding: 30px 22px; }
          .empathy-block h2 { font-size: 1.4rem; }
          .my-promise h3 { font-size: 1.3rem; }
        }

        /* ===== Tier Comparison Chart ===== */
        .comparison-chart-section {
          padding: 60px 0;
          background: #fafafa;
        }
        .comparison-chart-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 0 auto;
          max-width: 1000px;
        }
        .comparison-chart {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background: #fff;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 6px 24px rgba(0,0,0,0.08);
          min-width: 680px;
        }
        .comparison-chart th,
        .comparison-chart td {
          padding: 16px 14px;
          text-align: center;
          vertical-align: middle;
          border-bottom: 1px solid #eee;
        }
        .comparison-chart thead th {
          background: #f5f5f5;
          font-size: 0.95rem;
        }
        .cc-feature-col,
        .cc-feature {
          text-align: left !important;
          font-weight: 600;
          color: #333;
          min-width: 180px;
        }
        .cc-tier-col {
          position: relative;
        }
        .cc-tier-name {
          display: block;
          font-weight: 700;
          color: #222;
          font-size: 0.95rem;
        }
        .cc-tier-price {
          display: block;
          margin-top: 4px;
          color: #4CAF50;
          font-weight: 700;
          font-size: 1.15rem;
        }
        .cc-tier-price small {
          font-size: 0.7rem;
          color: #888;
          font-weight: 500;
        }
        .cc-yes { color: #00b300; font-size: 1.1rem; }
        .cc-no i { color: #ccc; font-size: 1rem; }
        .cc-cell { color: #555; font-size: 0.92rem; }
        .cc-sub { font-size: 0.72rem; color: #00913a; }
        .cc-seattle { font-size: 0.72rem; color: #999; font-weight: 400; }
        /* Highlighted Complete Transformation column */
        .cc-best {
          background: rgba(76, 175, 80, 0.08);
        }
        thead .cc-best {
          background: rgba(76, 175, 80, 0.16);
          border-top: 3px solid #4CAF50;
        }
        .cc-best .cc-tier-name { color: #2e7d32; }
        .cc-best-badge {
          display: inline-block;
          background: #4CAF50;
          color: #fff;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 999px;
          margin-bottom: 6px;
        }
        .comparison-chart-note {
          text-align: center;
          color: #888;
          font-size: 0.85rem;
          margin-top: 16px;
        }
        @media (max-width: 600px) {
          .comparison-chart th,
          .comparison-chart td { padding: 12px 8px; }
          .cc-tier-name { font-size: 0.82rem; }
        }


        .savings-link {
          color: inherit;
          text-decoration: none;
          position: relative;
          font-weight: bold;
          transition: all 0.3s ease;
        }
        
        .savings-link:hover {
          color: #00b300;
        }
        
        .savings-link:after {
          content: '';
          position: absolute;
          width: 100%;
          height: 2px;
          bottom: -2px;
          left: 0;
          background-color: #00b300;
          transform: scaleX(0);
          transform-origin: bottom right;
          transition: transform 0.3s ease;
        }
        
        .savings-link:hover:after {
          transform: scaleX(1);
          transform-origin: bottom left;
        }
      `}</style>
    </div>
  );
}
