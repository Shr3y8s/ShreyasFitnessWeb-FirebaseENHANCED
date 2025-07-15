document.addEventListener('DOMContentLoaded', () => {
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
});
