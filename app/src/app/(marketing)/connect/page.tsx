'use client';

import Link from 'next/link';
import { useEffect, useState, FormEvent } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ConnectPage() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'message'>('schedule');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: '',
    newsletter: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    // Check for #message hash in URL
    if (window.location.hash === '#message') {
      setActiveTab('message');
      setTimeout(() => {
        const messageElement = document.getElementById('message');
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }

    // Load Calendly script
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const limited = cleaned.substring(0, 10);
    
    if (limited.length === 0) return '';
    if (limited.length < 4) return `(${limited}`;
    if (limited.length < 7) return `(${limited.substring(0, 3)}) ${limited.substring(3)}`;
    return `(${limited.substring(0, 3)}) ${limited.substring(3, 6)}-${limited.substring(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    // Validate email
    if (!validateEmail(formData.email)) {
      setSubmitError('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Get service display text
      const serviceSelect = document.getElementById('service') as HTMLSelectElement;
      const serviceDisplayText = serviceSelect?.options[serviceSelect.selectedIndex]?.text || '';

      // Submit to Firestore
      await addDoc(collection(db, 'contact_form_submissions'), {
        Name: formData.name.trim(),
        Email: formData.email.trim(),
        EmailLower: formData.email.trim().toLowerCase(),
        Phone: formData.phone || null,
        Service: formData.service,
        ServiceDisplayText: serviceDisplayText,
        Message: formData.message.trim(),
        Newsletter: formData.newsletter,
        Status: 'Unread',
        Sent: serverTimestamp(),
        LastUpdated: serverTimestamp(),
        Replied: false,
        Archived: false
      });

      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        service: '',
        message: '',
        newsletter: false
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setSubmitError('There was an error sending your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const serviceDisplayName = () => {
    const serviceSelect = document.getElementById('service') as HTMLSelectElement;
    if (serviceSelect && serviceSelect.selectedIndex !== -1) {
      return serviceSelect.options[serviceSelect.selectedIndex].text;
    }
    return 'our services';
  };

  return (
    <div className="marketing-content">
      <link rel="stylesheet" href="/css/styles.css" />
      <link rel="stylesheet" href="/css/connect.css" />

      {/* Motivational Banner */}
      <section className="motivational-banner">
        <div className="motivation-top">
          <div className="container">
            <h2 className="motivation-headline">
              THE BEST TIME TO START WAS YESTERDAY.<br />THE SECOND BEST TIME IS TODAY.
            </h2>
          </div>
        </div>
        
        <div className="motivation-bottom">
          <div className="container">
            <div className="motivation-content">
              <p>
                As your dedicated fitness coach, I&apos;ll provide the <strong>expert guidance</strong>, <strong>accountability</strong>, and <strong>personalized attention</strong> you need to achieve lasting results – whether you&apos;re a <span className="emphasis">complete beginner</span> or looking to reach <span className="emphasis">new heights</span>.
              </p>
              
              <Link href="/services" className="motivation-button">
                Take the first step toward the stronger, healthier you that&apos;s waiting on the other side of action
                <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Connect Content */}
      <section id="connect-options" className="connect-page">
        <div className="container">
          {/* Connection Cards */}
          <div className="connection-cards">
            <div 
              className={`connection-card ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              <div className="card-icon">
                <i className="fas fa-calendar-check"></i>
              </div>
              <h3>Schedule a Free Consultation</h3>
              <p>Book a 15-minute slot directly on my calendar</p>
              <div className="card-cta">
                <span>Select this option</span>
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
            
            <div 
              className={`connection-card ${activeTab === 'message' ? 'active' : ''}`}
              onClick={() => setActiveTab('message')}
            >
              <div className="card-icon">
                <i className="fas fa-paper-plane"></i>
              </div>
              <h3>Send a Message</h3>
              <p>Get a response within 2-4 hours</p>
              <div className="card-cta">
                <span>Select this option</span>
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="connection-content-area">
            {/* Schedule Content */}
            <div 
              id="schedule-content" 
              className={`connection-content ${activeTab === 'schedule' ? 'active' : ''}`}
            >
              <div className="schedule-panel">
                <div className="panel-header">
                  <div className="header-icon">
                    <i className="fas fa-calendar-check"></i>
                  </div>
                  <h2>Schedule a Free Consultation</h2>
                  <p>Book a 15-minute consultation directly on my calendar</p>
                  <div className="response-time">
                    <i className="fas fa-clock"></i>
                    <span>Available Monday-Friday, 8am-6pm PST</span>
                  </div>
                </div>
                
                <div className="calendly-container">
                  <div 
                    className="calendly-inline-widget" 
                    data-url="https://calendly.com/shreyas-annapureddy/30min" 
                    style={{ minWidth: '320px', height: '800px' }}
                  ></div>
                </div>
                
                <div className="scheduling-note-enhanced">
                  <div className="privacy-note">
                    <i className="fas fa-info-circle"></i>
                    <span>Select a time that works for you. You&apos;ll receive a confirmation email with details</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Message Content */}
            <div 
              id="message-content" 
              className={`connection-content ${activeTab === 'message' ? 'active' : ''}`}
            >
              <div className="message-panel">
                <div id="message" className="panel-header">
                  <div className="header-icon">
                    <i className="fas fa-paper-plane"></i>
                  </div>
                  <h2>Send a Message</h2>
                  <p>Fill out the form below and I&apos;ll get back to you within 24 hours</p>
                  <div className="response-time">
                    <i className="fas fa-clock"></i>
                    <span>Typical response time: 2-4 hours</span>
                  </div>
                </div>
                
                {!submitSuccess ? (
                  <form onSubmit={handleSubmit} id="contact-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="name">
                          <i className="fas fa-user"></i> Your Name <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          placeholder="Enter your full name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="email">
                          <i className="fas fa-envelope"></i> Email Address <span className="required">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          placeholder="Enter your email address"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="phone">
                          <i className="fas fa-phone"></i> Phone Number <span className="optional">(Optional)</span>
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          placeholder="(XXX) XXX-XXXX"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="service">
                          <i className="fas fa-dumbbell"></i> Service Interest <span className="required">*</span>
                        </label>
                        <select
                          id="service"
                          name="service"
                          required
                          value={formData.service}
                          onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        >
                          <option value="" disabled>Select a service</option>
                          <option value="inperson">In-Person Training</option>
                          <option value="online">Online Coaching</option>
                          <option value="complete">Complete Transformation</option>
                          <option value="questions">General Questions</option>
                          <option value="other">Other Inquiry</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="form-group full-width">
                      <label htmlFor="message-text">
                        <i className="fas fa-comment-dots"></i> Your Message <span className="required">*</span>
                      </label>
                      <textarea
                        id="message-text"
                        name="message"
                        rows={5}
                        placeholder="Tell me about your fitness goals, current fitness level, any injuries or concerns, and what you hope to achieve through training..."
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      ></textarea>
                    </div>
                    
                    <div className="form-group checkbox-group-enhanced">
                      <div className="custom-checkbox">
                        <input
                          type="checkbox"
                          id="newsletter"
                          name="newsletter"
                          checked={formData.newsletter}
                          onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
                        />
                        <label htmlFor="newsletter">
                          <span className="checkmark"></span>
                          <span className="checkbox-text">
                            <strong>Subscribe to my fitness newsletter</strong>
                            <small>Get weekly tips, workout ideas, and nutrition advice</small>
                          </span>
                        </label>
                      </div>
                    </div>
                    
                    {submitError && (
                      <div className="error-message" style={{ marginBottom: '1rem' }}>
                        {submitError}
                      </div>
                    )}
                    
                    <button 
                      type="submit" 
                      className="btn-primary-enhanced full-width"
                      disabled={isSubmitting}
                    >
                      <i className="fas fa-paper-plane"></i>
                      <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                    </button>
                    
                    <div className="form-footer">
                      <div className="privacy-note">
                        <i className="fas fa-shield-alt"></i>
                        <span>Your information is secure and will never be shared</span>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="success-message">
                    <div className="success-icon">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <h3>Message Sent Successfully!</h3>
                    <p>
                      Thank you for reaching out. I&apos;ll get back to you regarding your interest in{' '}
                      <strong>{serviceDisplayName()}</strong> within 2-4 hours.
                    </p>
                    <button
                      onClick={() => setSubmitSuccess(false)}
                      className="btn-primary"
                    >
                      <span>Send Another Message</span>
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Get In Touch Section */}
          <div className="get-in-touch-section">
            <div className="panel-header">
              <div className="header-icon">
                <i className="fas fa-handshake"></i>
              </div>
              <h2>Get In Touch</h2>
              <p>Have questions or ready to start your fitness journey? I&apos;m here to help</p>
              <div className="response-time">
                <i className="fas fa-comments"></i>
                <span>Multiple ways to connect with me</span>
              </div>
            </div>
            
            <div className="contact-grid-map-focused">
              <div className="contact-info-column">
                <div className="contact-method-enhanced">
                  <div className="header-icon">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <div className="method-details">
                    <h3>Email</h3>
                    <p><a href="mailto:shreyas.annapureddy@gmail.com">shreyas.annapureddy@gmail.com</a></p>
                  </div>
                </div>
                
                <div className="contact-method-enhanced">
                  <div className="header-icon">
                    <i className="fab fa-whatsapp"></i>
                  </div>
                  <div className="method-details">
                    <h3>WhatsApp</h3>
                    <p><a href="https://wa.me/14258299961" target="_blank" rel="noopener noreferrer">(425) 829-9961</a></p>
                    <p className="detail-note">Available Monday-Friday, 8am-6pm PST</p>
                  </div>
                </div>
                
                <div className="contact-method-enhanced">
                  <div className="header-icon">
                    <i className="fas fa-location-dot"></i>
                  </div>
                  <div className="method-details">
                    <h3>Location</h3>
                    <p>Ironworks Gym</p>
                    <p><a href="https://maps.google.com/?q=12708+Northup+Way,+Bellevue,+WA+98005" target="_blank" rel="noopener noreferrer">12708 Northup Way, Bellevue, WA 98005</a></p>
                    <p className="detail-note">In-person sessions available at this location</p>
                  </div>
                </div>
              </div>
              
              <div className="map-column">
                <div className="map-container">
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3427.596730827469!2d-122.17353032360579!3d47.62884567119191!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x54906cfb814a2ebb%3A0x19407c747d7bf0e2!2s12708%20Northup%20Way%2C%20Bellevue%2C%20WA%2098005!5e1!3m2!1sen!2sus!4v1753525549530!5m2!1sen!2sus" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
