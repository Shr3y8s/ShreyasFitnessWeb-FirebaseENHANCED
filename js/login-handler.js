// Import AWS Amplify and other dependencies
import { Amplify } from 'https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/+esm';
import awsConfig from './aws-config.js';

// Initialize Amplify with our configuration
Amplify.configure(awsConfig);

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get the login form and phone field (if it exists)
    const loginForm = document.getElementById('login-form');
    const phoneField = document.getElementById('phone'); // This might not exist on the login form
    
    // Phone number formatting function
    function formatPhoneNumber(phoneNumber) {
        // Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Format the phone number based on length
        if (cleaned.length === 0) {
            return '';
        } else if (cleaned.length <= 3) {
            return `(${cleaned}`;
        } else if (cleaned.length <= 6) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
        } else if (cleaned.length <= 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        } else {
            // Handle numbers longer than 10 digits
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)} ${cleaned.slice(10)}`;
        }
    }
    
    // Add phone number formatting if phone field exists
    if (phoneField) {
        phoneField.addEventListener('input', function(e) {
            // Store cursor position
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const previousLength = this.value.length;
            
            // Format the phone number
            this.value = formatPhoneNumber(this.value);
            
            // Adjust cursor position based on formatting changes
            const newLength = this.value.length;
            const cursorAdjustment = newLength - previousLength;
            
            // Set cursor position
            if (cursorAdjustment !== 0) {
                this.setSelectionRange(start + cursorAdjustment, end + cursorAdjustment);
            }
        });
    }
    
    // Add submit event listener
    loginForm.addEventListener('submit', async function(event) {
        // Prevent the default form submission
        event.preventDefault();
        
        // Get form values
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            // Show loading state
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging In...';
            submitButton.disabled = true;
            
            // Sign in the user with Cognito
            const user = await Amplify.Auth.signIn(email, password);
            console.log('Sign in successful!', user);
            
            // Check user group and redirect accordingly
            const session = await Amplify.Auth.currentSession();
            const idToken = session.getIdToken().payload;
            
            // Update the user name in the dashboard
            document.getElementById('user-name').textContent = user.attributes.name || email;
            
            // Hide the login form and show the dashboard
            document.querySelector('.hero-content-account').style.display = 'none';
            document.getElementById('dashboard').classList.remove('hidden');
            
            // If user is in coaches group, redirect to coach dashboard
            if (idToken['cognito:groups'] && idToken['cognito:groups'].includes('coaches')) {
                // For now, we'll just alert - we'll create the coach dashboard later
                alert('Coach login detected! Redirecting to coach dashboard...');
                // In the future: window.location.href = 'coach-dashboard.html';
            }
            
        } catch (error) {
            console.error('Error signing in:', error);
            alert(`Login failed: ${error.message}`);
            
            // Reset button
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });
    
    // Add logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                await Amplify.Auth.signOut();
                console.log('Sign out successful!');
                
                // Show the login form and hide the dashboard
                document.querySelector('.hero-content-account').style.display = 'block';
                document.getElementById('dashboard').classList.add('hidden');
                
            } catch (error) {
                console.error('Error signing out:', error);
                alert(`Logout failed: ${error.message}`);
            }
        });
    }
    
    // Check if user is already signed in
    async function checkAuthState() {
        try {
            const user = await Amplify.Auth.currentAuthenticatedUser();
            console.log('User is signed in:', user);
            
            // Update the user name in the dashboard
            document.getElementById('user-name').textContent = user.attributes.name || user.username;
            
            // Hide the login form and show the dashboard
            document.querySelector('.hero-content-account').style.display = 'none';
            document.getElementById('dashboard').classList.remove('hidden');
            
        } catch (error) {
            console.log('User is not signed in');
            // User is not signed in, show the login form (default state)
        }
    }
    
    // Check auth state when page loads
    checkAuthState();
    
    // Remove the "Coming Soon" overlay
    const comingSoonOverlay = document.querySelector('div[style*="position: fixed"]');
    if (comingSoonOverlay) {
        comingSoonOverlay.remove();
    }
});
