/**
 * SHREY.FIT Form Validation Library
 * Provides reusable validation functions for various form inputs
 */

/**
 * Email validation
 * @param {string} email - Email address to validate
 * @returns {boolean} Whether the email is valid
 */
function isValidEmail(email) {
  // RFC 5322 compliant email regex
  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return email && emailRegex.test(email.trim());
}

/**
 * Format phone number as the user types
 * @param {string} value - Raw phone number input
 * @returns {string} Formatted phone number (XXX) XXX-XXXX
 */
function formatPhoneNumber(value) {
  if (!value) return value;
  
  // Remove all non-numeric characters
  const phoneNumber = value.replace(/[^\d]/g, '');
  
  // Format based on length
  if (phoneNumber.length < 4) {
    return phoneNumber;
  } else if (phoneNumber.length < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
function isValidPhone(phone) {
  if (!phone) return true; // Phone is optional
  // Check if phone has at least 10 digits
  return phone.replace(/[^\d]/g, '').length >= 10;
}

/**
 * Check password strength
 * @param {string} password - Password to check
 * @returns {Object} Strength assessment with level and messages
 */
function checkPasswordStrength(password) {
  if (!password) {
    return { 
      level: 'none', 
      score: 0,
      message: 'Password is required',
      requirements: [] 
    };
  }
  
  const requirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'At least one uppercase letter' },
    { met: /[a-z]/.test(password), text: 'At least one lowercase letter' },
    { met: /[0-9]/.test(password), text: 'At least one number' },
    { met: /[^A-Za-z0-9]/.test(password), text: 'At least one special character' }
  ];
  
  const score = requirements.filter(req => req.met).length;
  
  let level = 'weak';
  let message = 'Password is too weak';
  
  if (score >= 5) {
    level = 'strong';
    message = 'Strong password';
  } else if (score >= 3) {
    level = 'medium';
    message = 'Medium strength password';
  }
  
  return {
    level,
    score,
    message,
    requirements
  };
}

/**
 * Show password requirements with visual indicators
 * @param {Element} container - Container to show requirements in
 * @param {Array} requirements - Requirements array from checkPasswordStrength
 */
function showPasswordRequirements(container, requirements) {
  if (!container) return;
  
  container.innerHTML = '';
  
  requirements.forEach(req => {
    const item = document.createElement('div');
    item.className = `requirement-item ${req.met ? 'met' : 'not-met'}`;
    
    const icon = document.createElement('i');
    icon.className = req.met ? 'fas fa-check' : 'fas fa-times';
    
    const text = document.createElement('span');
    text.textContent = req.text;
    
    item.appendChild(icon);
    item.appendChild(text);
    container.appendChild(item);
  });
}

/**
 * Validate passwords match
 * @param {string} password - First password
 * @param {string} confirmPassword - Confirmation password
 * @returns {boolean} Whether the passwords match
 */
function passwordsMatch(password, confirmPassword) {
  return password === confirmPassword;
}

/**
 * Add validation styling to an input field
 * @param {Element} inputElement - The input element
 * @param {boolean} isValid - Whether input is valid
 * @param {string} message - Validation message
 */
function showValidationFeedback(inputElement, isValid, message) {
  // Find or create feedback element
  let feedbackElement = inputElement.parentNode.querySelector('.validation-feedback');
  
  if (!feedbackElement) {
    feedbackElement = document.createElement('div');
    feedbackElement.className = 'validation-feedback';
    inputElement.parentNode.appendChild(feedbackElement);
  }
  
  // Update input styling
  inputElement.classList.remove('valid-input', 'invalid-input');
  inputElement.classList.add(isValid ? 'valid-input' : 'invalid-input');
  
  // Show validation message
  if (message) {
    feedbackElement.innerHTML = `
      <span class="${isValid ? 'valid-feedback' : 'invalid-feedback'}">
        <i class="fas ${isValid ? 'fa-check-circle' : 'fa-exclamation-circle'} validation-icon"></i>
        ${message}
      </span>
    `;
  } else {
    feedbackElement.innerHTML = '';
  }
}

/**
 * Clean and standardize phone number for storage
 * @param {string} phone - Formatted phone number
 * @returns {string} Cleaned phone number
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}
