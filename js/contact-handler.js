// Import Amplify modules
import { Amplify, API, graphqlOperation } from 'https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/+esm';
import awsConfig from './aws-config.js';

// Initialize Amplify with our configuration
Amplify.configure(awsConfig);

// Enable debug logging
console.log('Contact handler initialized with AWS config:', JSON.stringify({
    region: awsConfig.Auth?.region || 'Not configured',
    userPoolId: awsConfig.Auth?.userPoolId ? 'Configured' : 'Not configured',
    apiEndpoint: awsConfig.API?.graphql_endpoint || 'Not configured'
}));

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get the contact form and phone field
    const contactForm = document.getElementById('contact-form');
    const phoneField = document.getElementById('phone');
    
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
    contactForm.addEventListener('submit', async function(event) {
        // Prevent the default form submission
        event.preventDefault();
        
        // Get form values
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value || '';
        const service = document.getElementById('service').value;
        const messageText = document.getElementById('message-text').value;
        
        try {
            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitButton.disabled = true;
            
            // Create message in database using GraphQL API
            const createMessageMutation = `
                mutation CreateMessage($input: CreateMessageInput!) {
                    createMessage(input: $input) {
                        id
                        senderName
                        senderEmail
                        subject
                        content
                        read
                        archived
                        createdAt
                    }
                }
            `;
            
            // Prepare the message input
            const messageInput = {
                senderName: name,
                senderEmail: email,
                subject: `New ${service} Inquiry`,
                content: `Service Interest: ${service}\nPhone: ${phone}\n\n${messageText}`,
                read: false,
                archived: false
            };
            
            // Note: Newsletter subscription checkbox has been removed from the form
            
            console.log('Sending message with input:', JSON.stringify(messageInput));
            
            // Send the message to the API
            const response = await API.graphql({
                query: createMessageMutation,
                variables: {
                    input: messageInput
                },
                authMode: 'API_KEY' // Use API key for unauthenticated users
            });
            
            console.log('Message sent successfully:', response);
            
            // Hide the form
            contactForm.style.display = 'none';
            
            // Show success message (using your existing success message code)
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
            
        } catch (error) {
            console.error('Error sending message:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            
            // Show detailed error message
            let errorMessage = `Failed to send message: ${error.message}`;
            
            // Add more context based on error type
            if (error.message.includes('Network Error')) {
                errorMessage += '\n\nThis appears to be a network issue. Please check your internet connection and try again.';
            } else if (error.message.includes('Not Authorized')) {
                errorMessage += '\n\nAuthorization error. The API key may be missing or invalid.';
            } else if (error.message.includes('GraphQL error')) {
                errorMessage += '\n\nGraphQL API error. The message format may be incorrect or the API endpoint may be unavailable.';
            }
            
            alert(errorMessage);
            
            // Reset button
            const submitButton = contactForm.querySelector('button[type="submit"]');
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });
});
