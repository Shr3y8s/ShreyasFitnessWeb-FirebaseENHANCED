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
                <div className="service-card-price">$70<span>/session</span></div>
                <p className="service-card-desc">Expert in-person coaching sessions focused on technique, form, and effective workouts tailored to your goals.</p>
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
                <p className="service-card-tagline">Achieve total fitness transformation</p>
                <div className="service-card-price">$199<span>/month</span></div>
                <p className="service-card-desc">Your complete transformation system - everything you need to build sustainable fitness habits and achieve lasting results.</p>
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
                <div className="service-card-badge elite-badge">Premium Experience</div>
                <div className="service-card-icon">
                  <i className="fas fa-crown"></i>
                </div>
                <h3 className="service-card-title">Complete Transformation</h3>
                <p className="service-card-tagline">Experience premium results</p>
                <div className="service-card-price">$199<span>/month</span> + $60<span>/session</span></div>
                <p className="service-card-desc">The complete package - comprehensive transformation support plus hands-on training for maximum results and accountability.</p>
                <span className="service-card-format">Seattle Premium Experience</span>
                <div className="card-action-buttons">
                  <button className="btn-secondary details-modal-btn" data-modal="eliteDetailsModal">Learn More</button>
                  <Link href="/connect" className="btn-primary elite-btn">Go Premium</Link>
                </div>
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
            <p>Choose the service level that best fits your goals, budget, and preferred coaching style</p>
          </div>
          <div className="approach-benefits">
            <div className="approach-benefit">
              <div className="approach-icon">
                <i className="fas fa-user"></i>
              </div>
              <h3>Just Need Expert Training?</h3>
              <p>Perfect for those who want hands-on guidance during workouts but prefer to manage nutrition and lifestyle independently.</p>
            </div>
            <div className="approach-benefit">
              <div className="approach-icon">
                <i className="fas fa-laptop"></i>
              </div>
              <h3>Want Remote Coaching Support?</h3>
              <p>Ideal for those seeking comprehensive coaching including training programs, nutrition guidance, and accountability from anywhere.</p>
            </div>
            <div className="approach-benefit">
              <div className="approach-icon">
                <i className="fas fa-crown"></i>
              </div>
              <h3>Want the Complete Package?</h3>
              <p>The best solution for those who want both comprehensive coaching and the benefits of in-person training sessions.</p>
            </div>
          </div>
          <div className="approach-note">
            <p>All services can be tailored to your specific needs, and you can easily upgrade your service tier as your fitness journey progresses.</p>
          </div>
        </div>
      </section>

      {/* Value Comparison Section */}
      <section className="value-comparison-section" id="value-comparison-section">
        <div className="container">
          <div className="section-header">
            <h2>Why Our Services Are Your Best Investment</h2>
            <p>See how our value compares to typical fitness coaching pricing</p>
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
                    <span className="comparison-label"><i className="fas fa-laptop"></i> Our Premium Services:</span>
                  </div>
                  <div className="comparison-value">
                    <span className="price-tag">$6.50</span><span className="price-period">/day</span>
                  </div>
                </div>
              </div>
              <div className="value-card-footer">
                <p>For just $1 more than coffee, get your entire fitness solution</p>
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
                      <td style={{padding: '12px 10px', textAlign: 'right'}}>Typical Fitness Coaching</td>
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
                      <td style={{padding: '12px 10px'}}>Unlimited Messaging Support</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$99</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>Weekly Progress Check-Ins</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$150</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>Video Form Analysis</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$125</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>Habit & Accountability Coaching</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}>Included</td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$250</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td style={{padding: '12px 10px'}}>4 In-Person Training Sessions</td>
                      <td style={{padding: '12px 10px', textAlign: 'center'}}><span className="price-tag">$240</span><span className="price-period">/month</span></td>
                      <td style={{padding: '12px 10px', textAlign: 'right'}}><span className="price-tag">$280</span><span className="price-period">/month</span></td>
                    </tr>
                    <tr style={{borderBottom: '2px dashed #e0e0e0', backgroundColor: '#f9f9f9', fontWeight: 600}}>
                      <td style={{padding: '14px 10px'}}>Total Monthly Cost</td>
                      <td style={{padding: '14px 10px', textAlign: 'center'}}><span className="price-tag">$439</span></td>
                      <td style={{padding: '14px 10px', textAlign: 'right'}}><span className="price-tag">$1,279</span></td>
                    </tr>
                    <tr style={{backgroundColor: 'rgba(76, 175, 80, 0.2)'}}>
                      <td style={{padding: '14px 10px', fontWeight: 600, color: 'var(--primary-dark)'}}>Monthly Savings</td>
                      <td style={{padding: '14px 10px', textAlign: 'center'}}></td>
                      <td style={{padding: '14px 10px', textAlign: 'right', fontWeight: 700}}><span className="price-tag" style={{color: '#00b300', fontSize: '1.3rem'}}>$840</span></td>
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
              <div className="modal-price">$70<span>/session</span></div>
              <p>4-session pack available: $240 ($60/session)</p>
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
            <p>Your complete transformation system that delivers everything you need to build sustainable fitness habits and achieve lasting results. This comprehensive program provides you with full support no matter where you are.</p>
            
            <div className="modal-price-callout">
              <div className="modal-price">$199<span>/month</span></div>
              <p>Less than $6.50 per day for complete fitness support</p>
            </div>
            
            <h3>What&apos;s Included:</h3>
            <ul className="modal-features">
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Custom Training Programs</strong>
                  <p>Personalized exercise plans updated monthly based on your progress, goals, and available equipment</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Complete Nutrition Coaching</strong>
                  <p>Personalized meal plans, dietary guidance, and nutritional education to support your fitness journey</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Unlimited Messaging Support</strong>
                  <p>Direct access to me with 24-hour response guarantee for questions, motivation, and guidance</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Weekly Progress Check-Ins</strong>
                  <p>Regular video calls to review progress, address challenges, and adjust your program as needed</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Video Form Analysis</strong>
                  <p>Submit workout videos for detailed technique feedback and exercise modifications</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Habit & Accountability Coaching</strong>
                  <p>Develop sustainable lifestyle habits with structured accountability and behavior change support</p>
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
                      <strong>In-Person Training Sessions</strong>
                      <p>Hands-on technique guidance and personalized coaching for maximum effectiveness</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Direct Physical Assessments</strong>
                      <p>In-person measurements and progress tracking for precise feedback</p>
                    </div>
                  </li>
                  <li>
                    <i className="fas fa-times"></i>
                    <div>
                      <strong>Equipment Guidance in Real-Time</strong>
                      <p>Immediate feedback during exercises to optimize form and prevent injury</p>
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
              <h4>Want In-Person Training Too?</h4>
              <p>Upgrade to the Complete Transformation to combine this comprehensive support with in-person training sessions.</p>
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
            <p>The ultimate fitness experience combining comprehensive transformation support with hands-on personal training. Get the best of both worlds with complete remote coaching plus in-person training sessions for maximum results.</p>
            
            <div className="modal-price-callout">
              <div className="modal-price">$199<span>/month</span> + $60<span>/session</span></div>
              <p>The complete package for your fitness success</p>
            </div>
            
            <div className="value-highlight elite">
              <div className="value-highlight-header">Premium Package:</div>
              <div className="value-highlight-body">Our most comprehensive solution for maximum results</div>
            </div>
            
            <div className="value-highlight elite">
              <div className="value-highlight-header">Value:</div>
              <div className="value-highlight-body"><a href="#value-comparison-section" className="savings-link">See how we can save you $800+ on premium fitness services! →</a></div>
            </div>
            
            <h3>What&apos;s Included:</h3>
            <ul className="modal-features">
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Everything From Online Coaching</strong>
                  <p>All the features of the comprehensive remote coaching program</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>In-Person Training Sessions</strong>
                  <p>Hands-on coaching sessions with expert guidance and form correction</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Flexible Session Scheduling</strong>
                  <p>Book sessions as needed to fit your schedule and budget ($60 per session)</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Session Package Option</strong>
                  <p>Save with a 4-session package for $240 ($60/session)</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>In-Person Progress Assessments</strong>
                  <p>Track your improvements with hands-on measurements and assessments</p>
                </div>
              </li>
              <li>
                <i className="fas fa-check"></i>
                <div>
                  <strong>Priority Support & Scheduling</strong>
                  <p>Get preferential booking times and faster response to your questions</p>
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
