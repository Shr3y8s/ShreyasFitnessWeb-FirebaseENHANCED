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
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

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
