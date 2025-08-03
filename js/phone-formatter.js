// Phone number formatter utility
// This script automatically formats phone numbers in all input fields with type="tel" or id="phone"

document.addEventListener('DOMContentLoaded', function() {
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
    
    // Function to add phone formatting to an input element
    function addPhoneFormatting(inputElement) {
        if (!inputElement) return;
        
        inputElement.addEventListener('input', function(e) {
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
        
        // Also format on initial load if there's a value
        if (inputElement.value) {
            inputElement.value = formatPhoneNumber(inputElement.value);
        }
    }
    
    // Find all phone input fields
    const phoneInputs = document.querySelectorAll('input[type="tel"], input#phone');
    
    // Apply formatting to each phone input
    phoneInputs.forEach(addPhoneFormatting);
    
    // For dynamically added phone fields, use a MutationObserver
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.nodeType === 1) { // Element node
                        // Check if the added node is a phone input
                        if ((node.tagName === 'INPUT' && (node.type === 'tel' || node.id === 'phone'))) {
                            addPhoneFormatting(node);
                        }
                        
                        // Check for phone inputs within the added node
                        const phoneInputsInNode = node.querySelectorAll('input[type="tel"], input#phone');
                        phoneInputsInNode.forEach(addPhoneFormatting);
                    }
                }
            }
        });
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
    
    console.log('Phone formatter initialized');
});
