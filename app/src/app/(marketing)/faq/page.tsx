'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function FAQPage() {
  useEffect(() => {
    // Small delay to ensure DOM is ready after client-side navigation
    const timer = setTimeout(() => {
      // FAQ accordion functionality
      const faqQuestions = document.querySelectorAll('.faq-question');
      const allAnswers = document.querySelectorAll('.faq-answer');
      
      // Initially hide all answers
      allAnswers.forEach(answer => {
        (answer as HTMLElement).style.display = 'none';
      });
      
      // Add click handlers
      faqQuestions.forEach(question => {
        question.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLElement;
          const answer = target.nextElementSibling as HTMLElement;
          const icon = target.querySelector('.toggle-icon i');
          
          // Close all other answers
          allAnswers.forEach(otherAnswer => {
            if (otherAnswer !== answer) {
              (otherAnswer as HTMLElement).style.display = 'none';
            }
          });
          
          // Toggle all icons
          document.querySelectorAll('.toggle-icon i').forEach(otherIcon => {
            if (otherIcon !== icon) {
              otherIcon.className = 'fas fa-plus';
            }
          });
          
          // Toggle this answer
          if (answer.style.display === 'none' || answer.style.display === '') {
            answer.style.display = 'block';
            answer.style.padding = '20px';
            answer.style.height = 'auto';
            answer.style.maxHeight = 'none';
            answer.style.overflow = 'visible';
            answer.style.backgroundColor = '#fff';
            answer.style.color = '#333';
            answer.style.lineHeight = '1.7';
            if (icon) icon.className = 'fas fa-minus';
          } else {
            answer.style.display = 'none';
            if (icon) icon.className = 'fas fa-plus';
          }
        });
      });
      
      // Modal functionality
      const infoButton = document.getElementById('faq-info-button');
      const infoModal = document.getElementById('faq-info-modal');
      const modalBackdrop = document.getElementById('faq-modal-backdrop');
      const modalClose = document.querySelector('.faq-modal-close');
      
      const closeModal = () => {
        if (infoModal) infoModal.style.display = 'none';
        if (modalBackdrop) modalBackdrop.style.display = 'none';
        document.body.style.overflow = '';
      };
      
      if (infoButton) {
        infoButton.addEventListener('click', () => {
          if (infoModal) infoModal.style.display = 'block';
          if (modalBackdrop) modalBackdrop.style.display = 'block';
          document.body.style.overflow = 'hidden';
        });
      }
      
      if (modalClose) {
        modalClose.addEventListener('click', closeModal);
      }
      
      if (modalBackdrop) {
        modalBackdrop.addEventListener('click', closeModal);
      }
      
      // Search functionality
      const searchInput = document.querySelector('#faq-search-input') as HTMLInputElement;
      const searchButton = document.querySelector('#search-button');
      const faqItems = document.querySelectorAll('.faq-item');
      const faqCategories = document.querySelectorAll('.faq-categories h2');
      
      const performSearch = () => {
        const searchTerm = searchInput?.value.toLowerCase().trim() || '';
        let resultsFound = false;
        
        faqItems.forEach(item => {
          const questionText = item.querySelector('.faq-question h3')?.textContent?.toLowerCase() || '';
          const answerText = item.querySelector('.faq-answer')?.textContent?.toLowerCase() || '';
          
          if (searchTerm === '' || questionText.includes(searchTerm) || answerText.includes(searchTerm)) {
            (item as HTMLElement).style.display = 'block';
            resultsFound = true;
          } else {
            (item as HTMLElement).style.display = 'none';
          }
        });
        
        // Show/hide categories
        faqCategories.forEach(category => {
          const nextContainer = category.nextElementSibling;
          let hasVisibleItems = false;
          
          const categoryItems = nextContainer?.querySelectorAll('.faq-item');
          categoryItems?.forEach(item => {
            if ((item as HTMLElement).style.display !== 'none') {
              hasVisibleItems = true;
            }
          });
          
          (category as HTMLElement).style.display = hasVisibleItems ? 'flex' : 'none';
          if (nextContainer) {
            (nextContainer as HTMLElement).style.display = hasVisibleItems ? 'block' : 'none';
          }
        });
      };
      
      if (searchInput) {
        searchInput.addEventListener('input', performSearch);
      }
      if (searchButton) {
        searchButton.addEventListener('click', (e) => {
          e.preventDefault();
          performSearch();
        });
      }
      
      // Category navigation
      const categoryLinks = document.querySelectorAll('.category-link');
      categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          
          categoryLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          
          const targetId = link.getAttribute('href')?.substring(1);
          if (targetId) {
            const target = document.getElementById(targetId);
            target?.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
      
      // Floating help button
      const helpButton = document.getElementById('show-help-popup');
      const helpPopup = document.getElementById('faq-question-popup');
      const closePopup = document.getElementById('close-faq-popup');
      
      if (helpButton && helpPopup) {
        helpButton.addEventListener('click', () => {
          helpPopup.classList.add('active');
        });
      }
      
      if (closePopup && helpPopup) {
        closePopup.addEventListener('click', () => {
          helpPopup.classList.remove('active');
        });
      }
    }, 100); // Small delay for DOM readiness after navigation

    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  return (
    <>
      <link rel="stylesheet" href="/css/styles.css" />
      <link rel="stylesheet" href="/css/faq.css" />
      
      {/* Page Header */}
      <section className="page-header">
        <div className="container">
          <h1>Frequently Asked Questions</h1>
          
          {/* FAQ Search */}
          <div className="faq-search">
            <input type="text" id="faq-search-input" placeholder="Search questions..." />
            <button id="search-button"><i className="fas fa-search"></i></button>
          </div>
          
          {/* FAQ Category Navigation */}
          <div className="faq-categories-nav">
            <a className="category-link active" href="#getting-started">Getting Started</a>
            <a className="category-link" href="#training">Training Info</a>
            <a className="category-link" href="#services">Services</a>
            <a className="category-link" href="#policies">Policies</a>
            <a className="category-link" href="#results">Results</a>
            <a className="category-link" href="#pricing">Pricing</a>
          </div>
          
          {/* Info Button */}
          <button id="faq-info-button" className="faq-info-btn" aria-label="About this FAQ">
            <i className="fas fa-info-circle"></i> About this FAQ
          </button>
        </div>
      </section>
      
      {/* FAQ Info Modal */}
      <div id="faq-info-modal" className="faq-modal">
        <div className="faq-modal-content">
          <span className="faq-modal-close">&times;</span>
          <h2>About this FAQ</h2>
          <p>Here you&apos;ll find answers to common questions about my training services, methods, and policies. If you don&apos;t find the answer you&apos;re looking for, don&apos;t hesitate to <Link href="/connect">reach out</Link>.</p>
        </div>
      </div>
      <div id="faq-modal-backdrop" className="faq-modal-backdrop"></div>

      {/* FAQ Content */}
      <section className="faq-page">
        <div className="container">
          <div className="faq-categories">
            <h2 id="getting-started">
              <span className="category-icon"><i className="fas fa-flag-checkered"></i></span>
              Getting Started
            </h2>
            <div className="faq-container">
              <div className="faq-item">
                <div className="faq-question">
                  <h3>How do I get started with training?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <div className="faq-important">
                    <strong>Don&apos;t worry - getting started doesn&apos;t have to be overwhelming!</strong> I&apos;ve designed a simple process to make your fitness journey as smooth as possible.
                  </div>
                  <p>The initial step is scheduling a <Link href="/connect#schedule-content" className="answer-highlight">complimentary 15-minute consultation</Link> where I&apos;ll answer your basic questions about my services, pricing options, and determine if we&apos;re a good fit to work together.</p>
                  <p>After you&apos;ve booked a training package or membership, we&apos;ll schedule a <span className="answer-highlight">comprehensive assessment session</span> where we&apos;ll conduct a detailed health history review, set specific goals, and create your personalized fitness program.</p>
                  <p><strong>Ready to get started?</strong> <Link href="/connect#schedule-content">Schedule your free consultation today!</Link></p>
                </div>
              </div>
              
              <div className="faq-item">
                <div className="faq-question">
                  <h3>Do I need to be fit already to start training?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <div className="faq-important">
                    <strong>No fitness experience required!</strong> I specialize in working with people at <span className="answer-highlight">all fitness levels</span>, including complete beginners.
                  </div>
                  <p>My programs are designed to meet you exactly where you are and help you progress at an appropriate pace for your current fitness level.</p>
                </div>
              </div>
              
              <div className="faq-item">
                <div className="faq-question">
                  <h3>What happens during the comprehensive assessment?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <p>After you&apos;ve signed up for a training package or membership, we&apos;ll schedule a comprehensive assessment session. This session lasts approximately 60 minutes and includes a detailed discussion about your health history, fitness background, specific goals, and lifestyle.</p>
                </div>
              </div>
              
              <div className="faq-item">
                <div className="faq-question">
                  <h3>What should I wear and bring to my training sessions?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <p>For training sessions, wear comfortable athletic clothing and supportive shoes appropriate for your workout. Bring a water bottle, a small towel, and any specific equipment we&apos;ve discussed (if applicable for home training).</p>
                </div>
              </div>
            </div>

            <h2 id="training">
              <span className="category-icon"><i className="fas fa-dumbbell"></i></span>
              Training Information
            </h2>
            <div className="faq-container">
              <div className="faq-item">
                <div className="faq-question">
                  <h3>Where do in-person sessions take place?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <p>I offer training at partnered gyms throughout the Seattle area, as well as home training for clients who have basic equipment. The exact location will be determined during our consultation based on your preferences and proximity.</p>
                </div>
              </div>
              
              <div className="faq-item">
                <div className="faq-question">
                  <h3>What equipment do I need for online coaching?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <p>Equipment requirements for online coaching vary based on your goals and what you have access to. I can design programs using minimal or no equipment, or for fully-equipped home or commercial gyms.</p>
                </div>
              </div>
              
              <div className="faq-item">
                <div className="faq-question">
                  <h3>How often will we meet for training?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <p>The frequency of sessions depends on your goals, availability, and budget. Most clients see best results with 2-3 sessions per week, but I offer flexible scheduling options.</p>
                </div>
              </div>
            </div>

            <h2 id="services">
              <span className="category-icon"><i className="fas fa-medal"></i></span>
              Services and Specialties
            </h2>
            <div className="faq-container">
              <div className="faq-item">
                <div className="faq-question">
                  <h3>Do you offer nutrition planning?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <div className="faq-important">
                    <strong>Yes!</strong> Nutrition is a crucial part of achieving your fitness goals, and I provide <span className="answer-highlight">practical nutrition guidance</span> that works with your lifestyle and training program.
                  </div>
                  <p>My approach focuses on building sustainable habits rather than restrictive diets. We&apos;ll work together to find nutrition strategies that support your training and fit your real life.</p>
                </div>
              </div>
              
              <div className="faq-item">
                <div className="faq-question">
                  <h3>Do you work with clients who have injuries or medical conditions?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <p>Yes, I work with clients who have various injuries and medical conditions, as long as they&apos;ve been cleared for exercise by their healthcare provider. Please discuss any health concerns during our initial consultation.</p>
                </div>
              </div>
            </div>

            <h2 id="policies">
              <span className="category-icon"><i className="fas fa-clipboard-list"></i></span>
              Policies and Logistics
            </h2>
            <div className="faq-container">
              <div className="faq-item">
                <div className="faq-question">
                  <h3>What is your cancellation policy?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <p>I require 24 hours notice for session cancellations. Sessions cancelled with less than 24 hours notice may be subject to a cancellation fee. I understand that emergencies happen, so exceptions can be made on a case-by-case basis.</p>
                </div>
              </div>
              
              <div className="faq-item">
                <div className="faq-question">
                  <h3>How are payments handled?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <p>I accept various payment methods including credit/debit cards and digital payment platforms. Payments are typically collected at the beginning of each training package or on a monthly basis for ongoing clients.</p>
                </div>
              </div>
            </div>

            <h2 id="results">
              <span className="category-icon"><i className="fas fa-chart-line"></i></span>
              Results & Expectations
            </h2>
            <div className="faq-container">
              <div className="faq-item">
                <div className="faq-question">
                  <h3>How quickly will I see results?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <div className="faq-callout">
                    <strong>Every fitness journey is unique</strong> - your results will depend on your starting point, goals, consistency, and genetics.
                  </div>
                  <p>During our work together, I&apos;ll help you track various metrics beyond just appearance to help you see your progress clearly and stay motivated throughout your journey.</p>
                </div>
              </div>
              
              <div className="faq-item">
                <div className="faq-question">
                  <h3>What kind of results can I expect?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <p>Beyond physical changes, clients typically experience improved energy levels, better sleep quality, enhanced mood, increased strength and endurance, better posture, reduced pain, and greater confidence.</p>
                </div>
              </div>
            </div>

            <h2 id="pricing">
              <span className="category-icon"><i className="fas fa-dollar-sign"></i></span>
              Pricing & Packages
            </h2>
            <div className="faq-container">
              <div className="faq-item popular-question">
                <div className="faq-question">
                  <h3>What do your services cost?</h3>
                  <span className="popular-badge">Most Asked</span>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <div className="faq-important">
                    All new clients receive a <Link href="/connect#schedule-content" className="answer-highlight">free consultation</Link> where I&apos;ll provide detailed pricing options based on your specific goals and requirements.
                  </div>
                  <ul className="enhanced-list">
                    <li><strong>In-Person Training:</strong> $70/session</li>
                    <li><strong>Online Coaching:</strong> $199/month (includes all remote coaching services)</li>
                    <li><strong>Complete Transformation:</strong> $199/month + $60/session (our premium package)</li>
                  </ul>
                </div>
              </div>
              
              <div className="faq-item">
                <div className="faq-question">
                  <h3>Do you offer package deals or discounts?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <p>Yes, I offer several ways to save on your fitness investment including package deals and referral bonuses.</p>
                </div>
              </div>
              
              <div className="faq-item">
                <div className="faq-question">
                  <h3>Is there a contract requirement?</h3>
                  <span className="toggle-icon"><i className="fas fa-plus"></i></span>
                </div>
                <div className="faq-answer">
                  <p>My service options are designed to be flexible while encouraging the consistency needed for real results. Online Coaching is month-to-month with no long-term contract required.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating Help Button */}
          <div className="floating-help-button" id="show-help-popup">
            <i className="fas fa-question-circle"></i>
            <span>Need Help?</span>
          </div>
          
          {/* FAQ Question Popup */}
          <div id="faq-question-popup" className="consultation-popup">
            <div className="popup-content">
              <span className="popup-close" id="close-faq-popup">&times;</span>
              <div className="popup-icon-container">
                <div className="popup-icon">
                  <i className="fas fa-question-circle"></i>
                </div>
              </div>
              <h3>Still Have Questions?</h3>
              <p>If you couldn&apos;t find the answer you were looking for, feel free to reach out directly.</p>
              <div className="popup-buttons">
                <Link href="/connect#message" className="btn-primary popup-btn">Contact Me</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
