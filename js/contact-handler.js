// AWS Amplify Contact Form Handler
console.log('Contact handler initialized with AWS Amplify');

// Function to initialize the contact form
function initializeContactForm() {
    // Configure AWS Amplify with our configuration
    try {
        // Make sure window.awsConfig exists
        if (!window.awsConfig) {
            console.error('AWS Config not found. Make sure aws-config.js is loaded properly.');
            return;
        }
        
        // Check if Amplify is defined
        if (typeof window.Amplify === 'undefined') {
            console.error('Amplify is not defined. Make sure amplify-bundle.min.js is loaded properly.');
            return;
        }
        
        // Configure Amplify with the global config
        window.Amplify.configure(window.awsConfig);
        console.log('Amplify configured successfully');
    } catch (error) {
        console.error('Error configuring Amplify:', error);
    }

    // Get the contact form
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) {
        console.error('Contact form not found');
        return;
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
            
            console.log('Sending message with input:', JSON.stringify(messageInput));
            
            console.log('Sending GraphQL request with Amplify API');
            
            // Send the message to the API
            const response = await window.Amplify.API.graphql({
                query: createMessageMutation,
                variables: {
                    input: messageInput
                },
                authMode: 'apiKey'
            }).catch(error => {
                console.error('GraphQL error details:', error);
                throw error;
            });
            
            console.log('Message sent successfully:', response);
            
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
            if (error.message && error.message.includes('Network Error')) {
                errorMessage += '\n\nThis appears to be a network issue. Please check your internet connection and try again.';
            } else if (error.message && error.message.includes('Not Authorized')) {
                errorMessage += '\n\nAuthorization error. The API key may be missing or invalid.';
            } else if (error.message && error.message.includes('GraphQL error')) {
                errorMessage += '\n\nGraphQL API error. The message format may be incorrect or the API endpoint may be unavailable.';
            }
            
            alert(errorMessage);
            
            // Reset button
            const submitButton = contactForm.querySelector('button[type="submit"]');
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });
}

// Initialize the contact form when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to ensure everything is loaded
    setTimeout(initializeContactForm, 100);
});

// Also expose the initialization function globally
window.initializeContactForm = initializeContactForm;
