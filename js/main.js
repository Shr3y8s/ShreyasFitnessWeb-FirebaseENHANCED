// Main JavaScript file for Shrey's Fitness Web
// This file loads the AWS Amplify library and initializes our custom functionality

// Import AWS Amplify
import { Amplify } from 'https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/+esm';

// Import our custom modules
import awsConfig from './aws-config.js';
import AuthHandler from './auth.js';
import ApiHandler from './api.js';
import UIHandler from './ui-handler.js';

// Import phone formatter (no need to assign to variable as it self-initializes)
import './phone-formatter.js';

// Initialize Amplify with our configuration
Amplify.configure(awsConfig);

// Export our modules for use in other scripts if needed
export {
    Amplify,
    awsConfig,
    AuthHandler,
    ApiHandler,
    UIHandler
};

// Log initialization
console.log('Shrey.Fit web application initialized with phone formatting');
