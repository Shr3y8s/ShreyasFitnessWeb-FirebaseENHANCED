document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a navigation link
    document.querySelectorAll('.nav-link').forEach(navLink => {
        navLink.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            // Special case for login/register switching
            if (targetId === '#show-register' || targetId === '#show-login') {
                return;
            }
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Form Submission Handling
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const service = document.getElementById('service').value;
            const message = document.getElementById('message').value;
            
            // Normally this would send data to a server
            // For demo purposes, we'll just show a success message
            
            alert(`Thank you for your message, ${name}! I'll get back to you soon regarding your interest in ${service} services.`);
            contactForm.reset();
        });
    }

    // My Account - Login/Register Form Switching
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const dashboard = document.getElementById('dashboard');

    if (showRegisterLink && showLoginLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });

        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }

    // Login Form Handling
    const loginFormElement = document.querySelector('.login-form');
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            // This is just a demo - in a real app, we would validate with a server
            if (email && password) {
                // Hide login form and show dashboard
                if (loginForm) loginForm.classList.add('hidden');
                if (registerForm) registerForm.classList.add('hidden');
                if (dashboard) {
                    dashboard.classList.remove('hidden');
                    
                    // Display user's name (in a real app, this would come from the server)
                    const userName = document.getElementById('user-name');
                    if (userName) {
                        // Extract name from email for demo purposes
                        const nameFromEmail = email.split('@')[0];
                        userName.textContent = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
                    }
                }
            }
        });
    }

    // Registration Form Handling
    const registerFormElement = document.querySelector('.register-form');
    if (registerFormElement) {
        registerFormElement.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm').value;
            
            // Basic validation
            if (password !== confirmPassword) {
                alert("Passwords don't match!");
                return;
            }
            
            // In a real app, we would send registration data to a server
            
            // For demo, directly show dashboard
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.add('hidden');
            if (dashboard) {
                dashboard.classList.remove('hidden');
                
                // Display user's name
                const userName = document.getElementById('user-name');
                if (userName && name) {
                    userName.textContent = name.split(' ')[0]; // Show first name only
                }
            }
        });
    }

    // Logout Functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (dashboard) dashboard.classList.add('hidden');
            if (loginForm) loginForm.classList.remove('hidden');
            
            // Clear form fields
            if (document.getElementById('login-email')) {
                document.getElementById('login-email').value = '';
                document.getElementById('login-password').value = '';
            }
        });
    }

    // Add animation on scroll
    const animateOnScroll = () => {
        const sections = document.querySelectorAll('section');
        
        sections.forEach(section => {
            const sectionPosition = section.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (sectionPosition < screenPosition) {
                section.classList.add('animate-in');
            }
        });
    };
    
    // Add initial CSS class for animation
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('section-hidden');
    });
    
    // Trigger once on load
    window.addEventListener('load', animateOnScroll);
    
    // Trigger on scroll
    window.addEventListener('scroll', animateOnScroll);

    // Add CSS for the animations
    const style = document.createElement('style');
    style.innerHTML = `
        .section-hidden {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .animate-in {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
});
