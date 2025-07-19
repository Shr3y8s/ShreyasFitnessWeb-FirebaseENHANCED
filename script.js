document.addEventListener('DOMContentLoaded', () => {
    // Problem Section Highlight Effects
    const boldStatements = document.querySelectorAll('.bold-statements h2[data-target], .bold-statements h3[data-target]');
    
    if (boldStatements.length > 0) {
        boldStatements.forEach(statement => {
            const targetId = statement.getAttribute('data-target');
            const targetParagraph = document.querySelector(`.highlight-target[data-section="${targetId}"]`);
            
            if (targetParagraph) {
                // Add hover events for mouse
                statement.addEventListener('mouseenter', () => {
                    targetParagraph.classList.add('active-highlight');
                });
                
                statement.addEventListener('mouseleave', () => {
                    targetParagraph.classList.remove('active-highlight');
                });
                
                // Add touch events for mobile
                statement.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    // Remove highlight from any other paragraphs
                    document.querySelectorAll('.highlight-target.active-highlight').forEach(p => {
                        if (p !== targetParagraph) {
                            p.classList.remove('active-highlight');
                        }
                    });
                    
                    // Toggle highlight on this paragraph
                    targetParagraph.classList.toggle('active-highlight');
                });
            }
        });
    }
    
    // Login Form Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic form validation
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                alert('Please fill out all required fields.');
                return;
            }
            
            // In a real implementation, you would authenticate the user here
            // For demo purposes, we'll just show a success message
            
            // Hide the form
            loginForm.style.display = 'none';
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Login Successful!</h3>
                <p>Welcome back! You're being redirected to your fitness dashboard.</p>
                <button class="btn-secondary" onclick="window.location.reload()">Return to Login</button>
            `;
            
            loginForm.parentNode.appendChild(successMessage);
        });
    }
    
    // Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking a nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // FAQ Accordion (if on FAQ page)
    const faqItems = document.querySelectorAll('.faq-item');
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => {
                item.classList.toggle('active');
            });
        });
    }

    // Modal functionality for service cards and footer links
    const modalButtons = document.querySelectorAll('.service-modal-btn, .service-modal-link');
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.modal-close');
    
    // Open modal when clicking the button or link
    if (modalButtons.length > 0) {
        modalButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = btn.getAttribute('data-modal');
                const modal = document.getElementById(modalId);
                
                if (modal) {
                    // Add a small delay before adding active class for animation purposes
                    setTimeout(() => {
                        modal.classList.add('active');
                    }, 10);
                    
                    // Prevent scrolling on the body
                    document.body.style.overflow = 'hidden';
                    
                    // Scroll to top of page when opening modal from footer links
                    if (btn.classList.contains('service-modal-link')) {
                        window.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    }
    
    // Close modal when clicking the close button
    if (closeButtons.length > 0) {
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                    
                    // Re-enable scrolling on the body
                    document.body.style.overflow = 'auto';
                }
            });
        });
    }
    
    // Close modal when clicking outside of modal content
    if (modals.length > 0) {
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                // Check if click is on the modal background (not on content)
                if (e.target === modal) {
                    modal.classList.remove('active');
                    
                    // Re-enable scrolling on the body
                    document.body.style.overflow = 'auto';
                }
            });
        });
    }
    
    // Close modal with escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                activeModal.classList.remove('active');
                
                // Re-enable scrolling on the body
                document.body.style.overflow = 'auto';
            }
        }
    });

    // Smooth scrolling for anchor links on the services page (for regular section links)
    const sectionLinks = document.querySelectorAll('a[href^="#"]:not(.service-modal-btn)');
    sectionLinks.forEach(link => {
        if (link.getAttribute('href').length > 1) { // Ignore links with just "#"
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== "#") {
                    e.preventDefault();
                    
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        // Add offset for fixed header
                        const headerOffset = 100;
                        const elementPosition = targetElement.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                        
                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        }
    });
    
    // Blog Card Subscribe Form Expansion
    const showSubscribeFormBtn = document.getElementById('showSubscribeFormBtn');
    const cardSubscribeForm = document.getElementById('cardSubscribeForm');
    
    if (showSubscribeFormBtn && cardSubscribeForm) {
        // Click handler for the subscribe button
        showSubscribeFormBtn.addEventListener('click', () => {
            // Hide button
            showSubscribeFormBtn.style.display = 'none';
            
            // Show form with animation
            cardSubscribeForm.classList.remove('hidden');
            
            // Focus on the email input
            const emailInput = cardSubscribeForm.querySelector('input[type="email"]');
            if (emailInput) {
                emailInput.focus();
            }
        });
        
        // Handle form submission
        cardSubscribeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get email value
            const emailInput = cardSubscribeForm.querySelector('input[type="email"]');
            const email = emailInput ? emailInput.value : '';
            
            // Basic validation
            if (!email || !email.includes('@')) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Replace form with success message
            const successMessage = document.createElement('div');
            successMessage.className = 'card-success-message';
            successMessage.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <p>Thank you for subscribing!</p>
            `;
            
            // Replace the form with success message
            cardSubscribeForm.parentNode.replaceChild(successMessage, cardSubscribeForm);
            
            // Optional: Also submit to the main subscribe form
            // This would be implemented in a real project
            // mainSubscribeForm.email.value = email;
            // mainSubscribeForm.submit();
        });
    }
});
