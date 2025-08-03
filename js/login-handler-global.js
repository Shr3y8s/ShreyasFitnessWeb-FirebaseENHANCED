// Login Handler JavaScript - Non-module version
document.addEventListener('DOMContentLoaded', function() {
    console.log('Login handler initialized');
    
    // Check if Amplify is defined
    if (typeof Amplify === 'undefined') {
        console.error('Amplify is not defined. Make sure amplify-bundle.min.js is loaded properly.');
        return;
    }
    
    // Configure Amplify with our configuration
    try {
        Amplify.configure(window.awsConfig);
        console.log('Amplify configured successfully for login handler');
    } catch (error) {
        console.error('Error configuring Amplify:', error);
    }
    
    // Get the login form
    const loginForm = document.getElementById('login-form');
    
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
            console.log('Attempting to sign in with:', email);
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
                window.location.href = 'coach-dashboard.html';
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
