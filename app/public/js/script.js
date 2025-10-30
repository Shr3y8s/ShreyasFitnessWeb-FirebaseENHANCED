// Direct modal opening function for inline onclick handlers
function openModal(modalId) {
    console.log("openModal function called with modalId:", modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        console.log("Found modal, displaying it");
        modal.classList.add('active');
    } else {
        console.error("Modal not found with ID:", modalId);
    }
}

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    // Problem/Emotion Section Highlighting
    const boldStatements = document.querySelectorAll('.bold-statements h2, .bold-statements h3');
    const highlightTargets = document.querySelectorAll('.highlight-target');
    
    boldStatements.forEach(statement => {
        // Add hover event listener
        statement.addEventListener('mouseenter', function() {
            const targetSection = this.getAttribute('data-target');
            
            // Remove active class from all targets first
            highlightTargets.forEach(target => {
                target.classList.remove('active-highlight');
            });
            
            // Add active class to matching target
            const matchingTarget = document.querySelector(`.highlight-target[data-section="${targetSection}"]`);
            if (matchingTarget) {
                matchingTarget.classList.add('active-highlight');
            }
        });
        
        // Add click event for mobile users
        statement.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-target');
            
            // Remove active class from all targets first
            highlightTargets.forEach(target => {
                target.classList.remove('active-highlight');
            });
            
            // Add active class to matching target
            const matchingTarget = document.querySelector(`.highlight-target[data-section="${targetSection}"]`);
            if (matchingTarget) {
                matchingTarget.classList.add('active-highlight');
            }
        });
    });
    
    // Remove highlight when mouse leaves the entire bold-statements section
    const boldStatementsSection = document.querySelector('.bold-statements');
    if (boldStatementsSection) {
        boldStatementsSection.addEventListener('mouseleave', function() {
            highlightTargets.forEach(target => {
                target.classList.remove('active-highlight');
            });
        });
    }
    
    // FAQ Question Popup
    const showHelpButton = document.getElementById('show-help-popup');
    const faqQuestionPopup = document.getElementById('faq-question-popup');
    const closeFaqPopup = document.getElementById('close-faq-popup');
    
    if (showHelpButton && faqQuestionPopup && closeFaqPopup) {
        // Show popup when help button is clicked
        showHelpButton.addEventListener('click', function() {
            faqQuestionPopup.style.display = 'block';
            showHelpButton.style.display = 'none';
        });
        
        // Hide popup when close button is clicked
        closeFaqPopup.addEventListener('click', function() {
            faqQuestionPopup.classList.add('hide');
            setTimeout(function() {
                faqQuestionPopup.style.display = 'none';
                faqQuestionPopup.classList.remove('hide');
                showHelpButton.style.display = 'flex';
            }, 500); // Match the animation duration
        });
    }
    
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    // Consultation popup functionality
    const isServicesPage = window.location.pathname.includes('services.html');
    const consultationPopup = document.getElementById('consultation-popup');
    
    if (isServicesPage && consultationPopup) {
        // Track if popup has been shown this session
        let popupShown = false;
        
        // Set up Intersection Observer to detect when approach section is visible
        const approachSection = document.querySelector('.approach-section');
        
        if (approachSection) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    // If approach section is visible and popup hasn't been shown yet
                    if (entry.isIntersecting && !popupShown) {
                        // Add a small delay to let user read some of the section first
                        setTimeout(() => {
                            consultationPopup.classList.add('show');
                            popupShown = true;
                        }, 2000); // 2 second delay after scrolling to section
                        
                        // Stop observing once triggered
                        observer.unobserve(approachSection);
                    }
                });
            }, { threshold: 0.3 }); // Trigger when 30% of the section is visible
            
            // Start observing the approach section
            observer.observe(approachSection);
        }
        
        // Close popup when X is clicked
        const popupClose = consultationPopup.querySelector('.popup-close');
        if (popupClose) {
            popupClose.addEventListener('click', () => {
                consultationPopup.classList.add('hide');
                setTimeout(() => {
                    consultationPopup.classList.remove('show');
                    consultationPopup.classList.remove('hide');
                }, 500); // Match animation duration
            });
        }
    }

    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when a link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Modal functionality
    const modals = document.querySelectorAll('.modal');
    const modalButtons = document.querySelectorAll('.service-modal-btn');
    const detailsModalButtons = document.querySelectorAll('.details-modal-btn');
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    const serviceModalLinks = document.querySelectorAll('.service-modal-link');

    // Service modals (booking/sign-up)
    modalButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
            }
        });
    });

    // Details modals (learn more)
    console.log("Found " + detailsModalButtons.length + " details modal buttons");
    
    detailsModalButtons.forEach((btn, index) => {
        console.log("Button " + index + " modal ID: " + btn.getAttribute('data-modal'));
        
        btn.addEventListener('click', function(e) {
            console.log("Details button clicked! Modal ID: " + this.getAttribute('data-modal'));
            e.preventDefault();
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            console.log("Found modal: ", modal);
            if (modal) {
                modal.classList.add('active');
            } else {
                console.error("Modal not found with ID: " + modalId);
            }
        });
    });

    serviceModalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
            }
        });
    });

    modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    window.addEventListener('click', function(e) {
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Feature list toggle functionality
    const showMoreButtons = document.querySelectorAll('.show-more-btn');
    
    showMoreButtons.forEach(button => {
        button.addEventListener('click', function() {
            const featureList = this.previousElementSibling;
            const hiddenFeatures = featureList.querySelectorAll('.feature-hidden');
            const isExpanded = this.getAttribute('data-expanded') === 'true';
            
            hiddenFeatures.forEach(feature => {
                feature.style.display = isExpanded ? 'none' : 'flex';
            });
            
            this.textContent = isExpanded ? '+ Show More Features' : '- Show Fewer Features';
            this.setAttribute('data-expanded', !isExpanded);
        });
    });
    
    // FOMO section toggle functionality (legacy)
    const fomoToggleButtons = document.querySelectorAll('.fomo-toggle');
    
    fomoToggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const fomoSection = this.nextElementSibling;
            const isExpanded = this.getAttribute('data-expanded') === 'true';
            
            if (isExpanded) {
                fomoSection.classList.add('collapsed');
                this.innerHTML = 'See what you\'re missing <i class="fas fa-chevron-down"></i>';
            } else {
                fomoSection.classList.remove('collapsed');
                this.innerHTML = 'Hide what you\'re missing <i class="fas fa-chevron-up"></i>';
            }
            
            this.setAttribute('data-expanded', !isExpanded);
        });
    });
    
    // What You're Missing section toggle functionality
    const missingToggleButtons = document.querySelectorAll('.missing-toggle');
    
    missingToggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const missingContent = this.closest('.missing-container').querySelector('.missing-content');
            const isExpanded = this.getAttribute('data-expanded') === 'true';
            
            if (isExpanded) {
                missingContent.classList.add('missing-section-collapsed');
                this.innerHTML = '<span>Show</span> <i class="fas fa-chevron-down"></i>';
            } else {
                missingContent.classList.remove('missing-section-collapsed');
                this.innerHTML = '<span>Hide</span> <i class="fas fa-chevron-up"></i>';
            }
            
            this.setAttribute('data-expanded', !isExpanded);
        });
    });
    
    // Expandable card functionality
    const expandButtons = document.querySelectorAll('.card-expand-btn');
    const collapseButtons = document.querySelectorAll('.card-collapse-btn');
    
    // Expand card content
    expandButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.service-card-item');
            const expandedContent = card.querySelector('.card-expanded-content');
            
            expandedContent.classList.remove('collapsed');
            button.style.display = 'none';
        });
    });
    
    // Collapse card content
    collapseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.service-card-item');
            const expandedContent = card.querySelector('.card-expanded-content');
            const expandButton = card.querySelector('.card-expand-btn');
            
            expandedContent.classList.add('collapsed');
            expandButton.style.display = 'flex';
        });
    });
});
