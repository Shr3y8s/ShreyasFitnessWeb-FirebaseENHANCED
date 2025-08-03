// AWS Amplify API Wrapper
// This file provides a wrapper around the Amplify API to ensure proper configuration

console.log('Loading Amplify API wrapper');

// Store the configuration globally
let savedConfig = null;

// Function to initialize the API wrapper
function initializeApiWrapper() {
    // Make sure Amplify is defined
    if (typeof window.Amplify === 'undefined') {
        console.error('Amplify is not defined. Make sure amplify-bundle.min.js is loaded properly.');
        return;
    }
    
    // Save the original configure method
    const originalConfigure = window.Amplify.configure;
    
    // Override the configure method to store the config
    window.Amplify.configure = function(config) {
        console.log('API wrapper: Storing configuration');
        savedConfig = config;
        
        // Call the original method
        return originalConfigure.call(window.Amplify, config);
    };
    
    // Make sure API is defined
    if (typeof window.Amplify.API === 'undefined') {
        console.error('Amplify API is not defined. Make sure amplify-bundle.min.js is loaded properly.');
        return;
    }
    
    // Log API initialization
    console.log('Amplify API wrapper initialized');
}

// Try to initialize immediately if Amplify is already loaded
if (typeof window.Amplify !== 'undefined') {
    initializeApiWrapper();
}

// Also wait for DOMContentLoaded to ensure everything is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to ensure Amplify is loaded
    setTimeout(initializeApiWrapper, 100);
});

// Also expose the initialization function globally
window.initializeAmplifyApiWrapper = initializeApiWrapper;
