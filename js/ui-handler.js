// UI Handler for Shrey's Fitness Web
import { Amplify } from 'aws-amplify';
import AuthHandler from './auth.js';
import ApiHandler from './api.js';
import awsConfig from './aws-config.js';

// Initialize Amplify
Amplify.configure(awsConfig);

// UI Handler functions
const UIHandler = {
    // Initialize the UI handler
    init() {
        // Remove "Coming Soon" overlays
        this.removeComingSoonOverlays();

        // Initialize page-specific functionality
        const currentPage = window.location.pathname.split('/').pop();
        
        if (currentPage === 'signup.html') {
            this.initSignupPage();
        } else if (currentPage === 'account.html') {
            this.initAccountPage();
        } else if (currentPage === 'connect.html') {
            this.initConnectPage();
        }

        // Check authentication status for all pages
        this.checkAuthStatus();
    },

    // Remove "Coming Soon" overlays from all pages
    removeComingSoonOverlays() {
        const overlays = document.querySelectorAll('div[style*="position: fixed; top: 0; left: 0; width: 100%; height: 100%;"]');
        overlays.forEach(overlay => {
            overlay.remove();
        });
    },

    // Initialize signup page functionality
    initSignupPage() {
        const signupForm = document.querySelector('.signup-form');
        if (!signupForm) return;

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullname = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validate form
            if (!fullname || !email || !password || !confirmPassword) {
                this.showMessage('Please fill out all required fields.', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                this.showMessage('Passwords do not match.', 'error');
                return;
            }
            
            // Show loading state
            const submitButton = signupForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            submitButton.disabled = true;
            
            try {
                // Sign up the user
                const result = await AuthHandler.signUp(email, password, fullname);
                
                if (result.success) {
                    // Show verification message
                    signupForm.innerHTML = `
                        <div class="success-message">
                            <div class="success-icon">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <h3>Verification Required</h3>
                            <p>Thank you for signing up! We've sent a verification code to your email address. Please check your inbox and enter the code below to complete your registration.</p>
                            <div class="form-group">
                                <label for="verification-code">Verification Code</label>
                                <input type="text" id="verification-code" placeholder="Enter verification code">
                            </div>
                            <button type="button" id="verify-button" class="btn-primary-enhanced">
                                <i class="fas fa-check"></i> Verify Account
                            </button>
                        </div>
                    `;
                    
                    // Add verification functionality
                    document.getElementById('verify-button').addEventListener('click', async () => {
                        const code = document.getElementById('verification-code').value;
                        if (!code) {
                            this.showMessage('Please enter the verification code.', 'error');
                            return;
                        }
                        
                        const verifyResult = await AuthHandler.confirmSignUp(email, code);
                        if (verifyResult.success) {
                            signupForm.innerHTML = `
                                <div class="success-message">
                                    <div class="success-icon">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                    <h3>Account Created Successfully!</h3>
                                    <p>Your account has been created and verified. You can now log in to access your dashboard.</p>
                                    <a href="account.html" class="btn-primary-enhanced">
                                        <i class="fas fa-sign-in-alt"></i> Go to Login
                                    </a>
                                </div>
                            `;
                        } else {
                            this.showMessage(verifyResult.error, 'error');
                        }
                    });
                } else {
                    // Show error message
                    this.showMessage(result.error, 'error');
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                }
            } catch (error) {
                this.showMessage('An unexpected error occurred. Please try again.', 'error');
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            }
        });
    },

    // Initialize account page functionality
    initAccountPage() {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            // Validate form
            if (!email || !password) {
                this.showMessage('Please enter both email and password.', 'error');
                return;
            }
            
            // Show loading state
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging In...';
            submitButton.disabled = true;
            
            try {
                // Sign in the user
                const result = await AuthHandler.signIn(email, password);
                
                if (result.success) {
                    // Check if user is a coach
                    const isCoach = await AuthHandler.isCoach();
                    
                    if (isCoach) {
                        // Redirect to coach dashboard (to be created)
                        window.location.href = 'coach-dashboard.html';
                    } else {
                        // Show client dashboard
                        this.showDashboard(result.user);
                    }
                } else {
                    // Show error message
                    this.showMessage(result.error, 'error');
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                }
            } catch (error) {
                this.showMessage('An unexpected error occurred. Please try again.', 'error');
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            }
        });

        // Add logout functionality
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await AuthHandler.signOut();
                window.location.reload();
            });
        }
    },

    // Initialize connect page functionality
    initConnectPage() {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm) return;

        // Override the existing submit handler
        contactForm.onsubmit = null;
        
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const service = document.getElementById('service').value;
            const message = document.getElementById('message-text').value;
            
            // Validate form
            if (!name || !email || !service || !message) {
                this.showMessage('Please fill out all required fields.', 'error');
                return;
            }
            
            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitButton.disabled = true;
            
            try {
                // Format the message content
                const content = `
Service Interest: ${service}
Phone: ${phone || 'Not provided'}
Message:
${message}
                `;
                
                // Send the message
                const result = await ApiHandler.sendMessage(name, email, `New Inquiry: ${service}`, content);
                
                if (result.success) {
                    // Hide the form
                    contactForm.style.display = 'none';
                    
                    // Show success message
                    const successMessage = document.createElement('div');
                    successMessage.className = 'success-message';
                    successMessage.innerHTML = `
                        <div class="success-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3>Message Sent Successfully!</h3>
                        <p>Thank you for reaching out, ${name}. I'll get back to you regarding your interest in ${service} within 2-4 hours.</p>
                        <button class="btn-secondary" onclick="window.location.reload()">Send Another Message</button>
                    `;
                    
                    contactForm.parentNode.appendChild(successMessage);
                    
                    // Add some basic styles for the success message
                    const style = document.createElement('style');
                    style.textContent = `
                        .success-message {
                            text-align: center;
                            padding: 40px 20px;
                            background-color: #f8fff8;
                            border-radius: 10px;
                            border: 1px solid #4CAF50;
                        }
                        .success-icon {
                            font-size: 48px;
                            color: #4CAF50;
                            margin-bottom: 20px;
                        }
                        .success-message h3 {
                            color: #4CAF50;
                            margin-bottom: 15px;
                        }
                        .success-message p {
                            margin-bottom: 25px;
                        }
                    `;
                    document.head.appendChild(style);
                } else {
                    // Show error message
                    this.showMessage(result.error, 'error');
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                }
            } catch (error) {
                this.showMessage('An unexpected error occurred. Please try again.', 'error');
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            }
        });
    },

    // Check authentication status and update UI accordingly
    async checkAuthStatus() {
        try {
            const result = await AuthHandler.currentAuthenticatedUser();
            
            if (result.success) {
                // User is logged in
                const user = result.user;
                const isCoach = await AuthHandler.isCoach();
                
                // Update navigation
                this.updateNavForLoggedInUser(user.attributes.name, isCoach);
                
                // If on account page, show dashboard
                const currentPage = window.location.pathname.split('/').pop();
                if (currentPage === 'account.html') {
                    this.showDashboard(user);
                }
            }
        } catch (error) {
            // User is not logged in, no action needed
        }
    },

    // Update navigation for logged in user
    updateNavForLoggedInUser(name, isCoach) {
        const accountBtn = document.querySelector('.account-btn');
        if (accountBtn) {
            accountBtn.textContent = `Welcome, ${name}`;
            accountBtn.href = isCoach ? 'coach-dashboard.html' : 'account.html';
        }
    },

    // Show dashboard for logged in user
    showDashboard(user) {
        // Hide login form
        const loginContainer = document.querySelector('.hero-login-container');
        if (loginContainer) {
            loginContainer.style.display = 'none';
        }
        
        // Show dashboard
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.classList.remove('hidden');
            
            // Update user name
            const userNameElement = document.getElementById('user-name');
            if (userNameElement && user.attributes) {
                userNameElement.textContent = user.attributes.name;
            }
        }
    },

    // Show message to user
    showMessage(message, type = 'info') {
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.innerHTML = `
            <div class="message-content">
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="close-message"><i class="fas fa-times"></i></button>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .message {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                background-color: ${type === 'error' ? '#ffebee' : '#e8f5e9'};
                color: ${type === 'error' ? '#c62828' : '#2e7d32'};
                border: 1px solid ${type === 'error' ? '#ef9a9a' : '#a5d6a7'};
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: space-between;
                max-width: 400px;
            }
            .message-content {
                display: flex;
                align-items: center;
            }
            .message-content i {
                margin-right: 10px;
                font-size: 18px;
            }
            .close-message {
                background: none;
                border: none;
                cursor: pointer;
                color: inherit;
                margin-left: 15px;
            }
        `;
        document.head.appendChild(style);
        
        // Add to document
        document.body.appendChild(messageElement);
        
        // Add close functionality
        messageElement.querySelector('.close-message').addEventListener('click', () => {
            messageElement.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 5000);
    }
};

// Initialize UI Handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    UIHandler.init();
});

export default UIHandler;
