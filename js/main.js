// Main JavaScript file for Shrey's Fitness Web
// This file loads the AWS Amplify library and initializes our custom functionality

// Use global Amplify object from amplify-bundle.min.js
const Amplify = window.Amplify;

// Use global awsConfig from aws-config.js (without redeclaring it)
// Access it directly as window.awsConfig when needed

// Define global variables for our modules
let AuthHandler, ApiHandler, UIHandler;

// Function to initialize the application
function initializeApp() {
    // Make sure Amplify and awsConfig are defined
    if (!Amplify) {
        console.error('Amplify is not defined. Make sure amplify-bundle.min.js is loaded properly.');
        return;
    }
    
    if (!window.awsConfig) {
        console.error('AWS Config is not defined. Make sure aws-config.js is loaded properly.');
        return;
    }
    
// Initialize Amplify with our configuration
    Amplify.configure(window.awsConfig);
    
    // Load our custom modules if they exist
    try {
        if (window.AuthHandler) AuthHandler = window.AuthHandler;
        if (window.ApiHandler) ApiHandler = window.ApiHandler;
        if (window.UIHandler) UIHandler = window.UIHandler;
    } catch (error) {
        console.error('Error loading custom modules:', error);
    }
    
    // Log initialization
    console.log('Shrey.Fit web application initialized');
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to ensure everything is loaded
    setTimeout(initializeApp, 100);
});

// Make our modules available globally
window.ShreysApp = {
    Amplify,
    AuthHandler,
    ApiHandler,
    UIHandler,
    initializeApp
};
