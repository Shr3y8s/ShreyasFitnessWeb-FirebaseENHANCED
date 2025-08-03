// Signup Handler JavaScript - Non-module version
document.addEventListener('DOMContentLoaded', function() {
    console.log('Signup handler initialized');
    
    // Check if Amplify is defined
    if (typeof Amplify === 'undefined') {
        console.error('Amplify is not defined. Make sure amplify-bundle.min.js is loaded properly.');
        return;
    }
    
    // Configure Amplify with our configuration
    try {
        Amplify.configure(window.awsConfig);
        console.log('Amplify configured successfully for signup handler');
    } catch (error) {
        console.error('Error configuring Amplify:', error);
    }
    
    // Get the signup form and form fields
    const signupForm = document.querySelector('.signup-form');
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirm-password');
    const emailField = document.getElementById('email');
    const phoneField = document.getElementById('phone');
    
    // Password validation elements
    const lengthCheck = document.getElementById('length-check');
    const uppercaseCheck = document.getElementById('uppercase-check');
    const lowercaseCheck = document.getElementById('lowercase-check');
    const numberCheck = document.getElementById('number-check');
    const specialCheck = document.getElementById('special-check');
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');
    const passwordMatchMessage = document.getElementById('password-match-message');
    
    // Password validation function
    function validatePassword(password) {
        // Check requirements
        const hasLength = password.length >= 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        
        // Update requirement checks
        updateRequirementCheck(lengthCheck, hasLength);
        updateRequirementCheck(uppercaseCheck, hasUppercase);
        updateRequirementCheck(lowercaseCheck, hasLowercase);
        updateRequirementCheck(numberCheck, hasNumber);
        updateRequirementCheck(specialCheck, hasSpecial);
        
        // Calculate strength
        let strength = 0;
        if (hasLength) strength += 20;
        if (hasUppercase) strength += 20;
        if (hasLowercase) strength += 20;
        if (hasNumber) strength += 20;
        if (hasSpecial) strength += 20;
        
        // Update strength meter
        strengthFill.style.width = strength + '%';
        
        // Set color based on strength
        if (strength < 40) {
            strengthFill.style.backgroundColor = '#dc3545'; // Red
            strengthText.textContent = 'Weak password';
        } else if (strength < 80) {
            strengthFill.style.backgroundColor = '#ffc107'; // Yellow
            strengthText.textContent = 'Moderate password';
        } else {
            strengthFill.style.backgroundColor = '#28a745'; // Green
            strengthText.textContent = 'Strong password';
        }
        
        // Return if all requirements are met
        return hasLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    }
    
    // Update requirement check icon
    function updateRequirementCheck(element, isValid) {
        if (!element) return; // Skip if element doesn't exist
        
        if (isValid) {
            element.innerHTML = '<i class="fas fa-check-circle"></i> ' + element.textContent.substring(element.textContent.indexOf(' ') + 1);
        } else {
            element.innerHTML = '<i class="fas fa-times-circle"></i> ' + element.textContent.substring(element.textContent.indexOf(' ') + 1);
        }
    }
    
    // Check if passwords match
    function checkPasswordsMatch() {
        if (!passwordMatchMessage) return; // Skip if element doesn't exist
        
        const password = passwordField.value;
        const confirmPassword = confirmPasswordField.value;
        
        if (confirmPassword === '') {
            passwordMatchMessage.textContent = '';
            passwordMatchMessage.className = '';
        } else if (password === confirmPassword) {
            passwordMatchMessage.textContent = 'Passwords match';
            passwordMatchMessage.className = 'match-success';
        } else {
            passwordMatchMessage.textContent = 'Passwords do not match';
            passwordMatchMessage.className = 'match-error';
        }
    }
    
    // Email validation function
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Add event listeners for real-time validation
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            validatePassword(this.value);
            if (confirmPasswordField && confirmPasswordField.value !== '') {
                checkPasswordsMatch();
            }
        });
    }
    
    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('input', checkPasswordsMatch);
    }
    
    if (emailField) {
        emailField.addEventListener('blur', function() {
            if (this.value !== '' && !validateEmail(this.value)) {
                this.setCustomValidity('Please enter a valid email address');
                this.reportValidity();
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    // Add submit event listener
    if (signupForm) {
        signupForm.addEventListener('submit', async function(event) {
            // Prevent the default form submission
            event.preventDefault();
            
            // Get form values
            const fullName = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone') ? document.getElementById('phone').value : '';
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Basic validation
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            try {
                // Show loading state
                const submitButton = signupForm.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.innerHTML;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
                submitButton.disabled = true;
                
                console.log('Starting signup process with AWS Cognito...');
                console.log('Form values:', { fullName, email, phone: phone || 'Not provided' });
                
                // Clean phone number for AWS Cognito (needs +1 format)
                const cleanedPhone = phone ? `+1${phone.replace(/\D/g, '')}` : undefined;
                
                const { user } = await Amplify.Auth.signUp({
                    username: email,
                    password: password,
                    attributes: {
                        email,
                        name: fullName,
                        phone_number: cleanedPhone
                    }
                });
                
                console.log('Sign up successful!', user);
                
                // Create a success message div with enhanced instructions
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                        <div style="font-size: 48px; color: #4CAF50; margin-bottom: 20px;">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3 style="color: #4CAF50; margin-bottom: 15px;">Account Created Successfully!</h3>
                        <div style="text-align: left; max-width: 500px; margin: 0 auto 25px;">
                            <h4 style="margin-bottom: 10px;">Next Steps:</h4>
                            <ol style="padding-left: 20px; margin-bottom: 20px;">
                                <li style="margin-bottom: 10px;">Check your email inbox for a verification code from <strong>no-reply@verificationemail.com</strong></li>
                                <li style="margin-bottom: 10px;">Enter the verification code on the login page to verify your account</li>
                                <li style="margin-bottom: 10px;">Once verified, log in with your email and password</li>
                                <li style="margin-bottom: 10px;">Access your personalized fitness dashboard</li>
                            </ol>
                            <p style="padding: 10px; background-color: #f8f8f8; border-radius: 4px; font-size: 0.9rem;">
                                <i class="fas fa-info-circle" style="color: #2196F3;"></i> 
                                <strong>Note:</strong> If you don't see the email, please check your spam/junk folder.
                            </p>
                        </div>
                        <a href="account.html" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin-right: 10px;">
                            <i class="fas fa-sign-in-alt"></i> Go to Login
                        </a>
                    </div>
                `;
                
                // Replace the form with the success message
                const signupContainer = document.querySelector('.signup-form-container');
                signupContainer.innerHTML = '';
                signupContainer.appendChild(successMessage);
                
            } catch (error) {
                console.error('Error signing up:', error);
                console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                });
                
                // Create a more detailed error message
                let errorMessage = `Sign up failed: ${error.message}`;
                
                // Add specific guidance based on error type
                if (error.code === 'InvalidParameterException' && error.message.includes('password')) {
                    errorMessage += '\n\nPassword requirements: at least 8 characters, including uppercase, lowercase, numbers, and special characters.';
                } else if (error.code === 'UsernameExistsException') {
                    errorMessage += '\n\nThis email is already registered. Please try logging in instead.';
                } else if (error.code === 'InvalidEmailRoleAccessPolicyException') {
                    errorMessage += '\n\nThere is an issue with the email configuration. Please contact support.';
                } else if (error.name === 'NoUserPoolException') {
                    errorMessage += '\n\nAWS Cognito configuration issue. Please contact support.';
                } else {
                    // Add more detailed error information for debugging
                    errorMessage += `\n\nError details: ${JSON.stringify({
                        name: error.name,
                        code: error.code,
                        message: error.message
                    })}`;
                }
                
                alert(errorMessage);
                
                // Reset button
                const submitButton = signupForm.querySelector('button[type="submit"]');
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }
    
    // Remove the "Coming Soon" overlay
    const comingSoonOverlay = document.querySelector('div[style*="position: fixed"]');
    if (comingSoonOverlay) {
        comingSoonOverlay.remove();
    }
});
