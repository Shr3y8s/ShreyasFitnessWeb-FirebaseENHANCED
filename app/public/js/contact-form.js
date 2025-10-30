// Firebase configuration - commented out as we're using the one from auth.js
// We're keeping this here for documentation but not initializing again
/*
const firebaseConfig = {
  apiKey: "AIzaSyADF9yuram-pvlzjg6kBtdCk7LuK0M65tk",
  authDomain: "shreyfitweb.firebaseapp.com",
  projectId: "shreyfitweb",
  storageBucket: "shreyfitweb.firebasestorage.app",
  messagingSenderId: "1076359633281",
  appId: "1:1076359633281:web:3687e1675c9e185f0ab080",
  measurementId: "G-5GBP19SXBW"
};
*/

// Use existing Firebase instance from auth.js with different variable names to avoid conflicts
let contactFormFirebaseApp;
let contactFormDb;

// Check if Firebase is already initialized
if (typeof firebase !== 'undefined') {
  console.log('Contact form: Using existing Firebase app');
  if (firebase.apps.length > 0) {
    contactFormFirebaseApp = firebase.app(); // Get the already initialized app
    contactFormDb = firebase.firestore(); // Get Firestore instance
  } else {
    console.error('Firebase is defined but no apps are initialized');
  }
} else {
  console.error('Firebase SDK not found or not loaded');
}

// Validate email address
function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// Format phone number to (XXX) XXX-XXXX
function formatPhoneNumber(phoneNumberString) {
  // Strip all non-digit characters
  const cleaned = ('' + phoneNumberString).replace(/\D/g, '');
  
  // Check if the number is valid (10 digits)
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  
  // Return original if not 10 digits
  return phoneNumberString;
}

// Get reference to your form
document.addEventListener('DOMContentLoaded', function() {
  const contactForm = document.getElementById('contact-form');
  
  if (contactForm) {
    // Add form submission handler
    contactForm.addEventListener('submit', handleFormSubmit);
    
    // Add real-time phone formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', function(e) {
        // Get input value and remove non-digits
        let input = this.value.replace(/\D/g, '');
        
        // Limit to 10 digits
        input = input.substring(0, 10);
        
        // Format the number as the user types
        if (input.length > 0) {
          if (input.length < 4) {
            this.value = '(' + input;
          } else if (input.length < 7) {
            this.value = '(' + input.substring(0, 3) + ') ' + input.substring(3);
          } else {
            this.value = '(' + input.substring(0, 3) + ') ' + input.substring(3, 6) + '-' + input.substring(6);
          }
          
          // Add validation feedback for phone number
          const feedbackElement = this.nextElementSibling;
          if (input.length === 10) {
            this.classList.add('valid-input');
            this.classList.remove('invalid-input');
            if (feedbackElement && feedbackElement.classList.contains('validation-feedback')) {
              feedbackElement.innerHTML = '<span class="valid-feedback"><i class="fas fa-check validation-icon"></i> Valid phone number</span>';
            }
          } else {
            this.classList.add('invalid-input');
            this.classList.remove('valid-input');
            if (feedbackElement && feedbackElement.classList.contains('validation-feedback')) {
              feedbackElement.innerHTML = '<span class="invalid-feedback">Please enter a 10-digit phone number</span>';
            }
          }
        } else {
          // Reset when empty
          this.classList.remove('valid-input', 'invalid-input');
          const feedbackElement = this.nextElementSibling;
          if (feedbackElement && feedbackElement.classList.contains('validation-feedback')) {
            feedbackElement.innerHTML = '';
          }
        }
      });
    }
    
    // Add real-time email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.addEventListener('input', function() {
        const feedbackElement = this.nextElementSibling;
        
        if (this.value) {
          if (validateEmail(this.value)) {
            this.classList.add('valid-input');
            this.classList.remove('invalid-input');
            if (feedbackElement && feedbackElement.classList.contains('validation-feedback')) {
              feedbackElement.innerHTML = '<span class="valid-feedback"><i class="fas fa-check validation-icon"></i> Valid email address</span>';
            }
          } else {
            this.classList.add('invalid-input');
            this.classList.remove('valid-input');
            if (feedbackElement && feedbackElement.classList.contains('validation-feedback')) {
              feedbackElement.innerHTML = '<span class="invalid-feedback"><i class="fas fa-exclamation-circle validation-icon"></i> Please enter a valid email address</span>';
            }
          }
        } else {
          // Reset when empty
          this.classList.remove('valid-input', 'invalid-input');
          if (feedbackElement && feedbackElement.classList.contains('validation-feedback')) {
            feedbackElement.innerHTML = '';
          }
        }
      });
    }
  }
});

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  // Get form fields - these IDs match your actual form in connect.html
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone'); 
  const serviceInput = document.getElementById('service');
  const messageInput = document.getElementById('message-text'); // Note: your form uses "message-text" not "message"
  const newsletterInput = document.getElementById('newsletter');
  
  // Get form and create status element
  const contactForm = e.target;
  const submitButton = contactForm.querySelector('button[type="submit"]');
  let statusElement = document.getElementById('form-status');
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'form-status';
    contactForm.appendChild(statusElement);
  }
  
  // Show sending status
  statusElement.textContent = "Sending message...";
  submitButton.disabled = true;

  // Validate email
  if (!validateEmail(emailInput.value)) {
    statusElement.textContent = "Please enter a valid email address.";
    statusElement.className = "error-message";
    submitButton.disabled = false;
    return;
  }
  
  // Format phone number if provided
  const formattedPhone = phoneInput && phoneInput.value ? formatPhoneNumber(phoneInput.value) : null;
  
  try {
    // Get service display text for dashboard
    let serviceDisplayText = '';
    if (serviceInput && serviceInput.selectedIndex !== -1) {
      serviceDisplayText = serviceInput.options[serviceInput.selectedIndex].text || '';
    }
    
    // Create message object with formatted data and dashboard-friendly structure
    const message = {
      Name: nameInput.value.trim(),
      Email: emailInput.value.trim(), // Keep original email case
      EmailLower: emailInput.value.trim().toLowerCase(), // For case-insensitive searching
      Phone: formattedPhone,
      Service: serviceInput ? serviceInput.value : null,
      ServiceDisplayText: serviceDisplayText, // Store display text for dashboard
      Message: messageInput.value.trim(),
      Newsletter: newsletterInput ? newsletterInput.checked : false,
      
      // Enhanced metadata with better names for dashboard
      Status: 'Unread',
      Sent: firebase.firestore.FieldValue.serverTimestamp(),
      LastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      Replied: false,
      Archived: false
    };
    
    // Save to Firestore
    await contactFormDb.collection('contact_form_submissions').add(message);
    
    // Hide the form
    contactForm.style.display = 'none';
    
    // Get formatted service text
    let serviceText = '';
    if (serviceInput && serviceInput.selectedIndex !== -1) {
      const selectedOption = serviceInput.options[serviceInput.selectedIndex];
      serviceText = selectedOption.text || serviceInput.value;
    } else {
      serviceText = 'our services';
    }
    
    // Create a full success message with enhanced visual appeal
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
      <div class="success-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <h3>Message Sent Successfully!</h3>
      <p>Thank you for reaching out, <strong>${nameInput.value}</strong>. I'll get back to you regarding your interest in <strong>${serviceText}</strong> within 2-4 hours.</p>
      <button id="send-another-btn">
        <span>Send Another Message</span>
        <i class="fas fa-paper-plane"></i>
      </button>
    `;
    
    // Add the success message to the page
    contactForm.parentNode.appendChild(successMessage);
    
    // Add event listener to the "Send Another Message" button
    document.getElementById('send-another-btn').addEventListener('click', function() {
      // Remove success message
      successMessage.remove();
      
      // Reset and show the form again
      contactForm.reset();
      contactForm.style.display = '';
      
      // Re-enable the submit button
      submitButton.disabled = false;
    });
    
  } catch (error) {
    console.error("Error sending message:", error);
    
    // Show error message
    statusElement.textContent = "There was an error sending your message. Please try again.";
    statusElement.className = "error-message";
    
    // Re-enable the submit button
    submitButton.disabled = false;
  }
}
