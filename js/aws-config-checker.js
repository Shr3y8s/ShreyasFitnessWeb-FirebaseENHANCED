// AWS Configuration Checker
// This script helps diagnose issues with AWS configuration

import { Amplify, Auth, API, graphqlOperation } from 'https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/+esm';
import awsConfig from './aws-config.js';

// Initialize Amplify with our configuration
Amplify.configure(awsConfig);

// Display the configuration
console.log('AWS Configuration:');
console.log('Region:', awsConfig.Auth?.region || 'Not configured');
console.log('User Pool ID:', awsConfig.Auth?.userPoolId || 'Not configured');
console.log('User Pool Web Client ID:', awsConfig.Auth?.userPoolWebClientId ? 'Configured (masked)' : 'Not configured');
console.log('Identity Pool ID:', awsConfig.Auth?.identityPoolId || 'Not configured');
console.log('API Endpoint:', awsConfig.API?.graphql_endpoint || 'Not configured');
console.log('API Key:', awsConfig.API?.apiKey ? 'Configured (masked)' : 'Not configured');

// Check if API Key is present
if (!awsConfig.API?.apiKey) {
    console.error('API Key is missing! This is required for unauthenticated API calls.');
    document.getElementById('api-key-status').innerHTML = '<span class="error">❌ API Key is missing!</span>';
} else {
    console.log('API Key is present.');
    document.getElementById('api-key-status').innerHTML = '<span class="success">✅ API Key is configured</span>';
}

// Test API connection
async function testApiConnection() {
    try {
        console.log('Testing API connection...');
        document.getElementById('api-connection-status').textContent = 'Testing...';
        
        // Simple query to test connection
        const testQuery = `
            query TestConnection {
                __typename
            }
        `;
        
        const result = await API.graphql({
            query: testQuery,
            authMode: 'API_KEY'
        });
        
        console.log('API connection successful:', result);
        document.getElementById('api-connection-status').innerHTML = '<span class="success">✅ API connection successful</span>';
        return true;
    } catch (error) {
        console.error('API connection error:', error);
        document.getElementById('api-connection-status').innerHTML = `<span class="error">❌ API connection failed: ${error.message}</span>`;
        return false;
    }
}

// Test message creation
async function testMessageCreation() {
    try {
        console.log('Testing message creation...');
        document.getElementById('message-creation-status').textContent = 'Testing...';
        
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
        
        const messageInput = {
            senderName: 'Config Test',
            senderEmail: 'config@test.com',
            subject: 'Configuration Test',
            content: 'This is a test message created from the AWS config checker.',
            read: false,
            archived: false
        };
        
        const result = await API.graphql({
            query: createMessageMutation,
            variables: { input: messageInput },
            authMode: 'API_KEY'
        });
        
        console.log('Test message created:', result.data.createMessage);
        document.getElementById('message-creation-status').innerHTML = `
            <span class="success">✅ Test message created successfully</span>
            <pre>${JSON.stringify(result.data.createMessage, null, 2)}</pre>
        `;
        return true;
    } catch (error) {
        console.error('Error creating test message:', error);
        document.getElementById('message-creation-status').innerHTML = `
            <span class="error">❌ Test message creation failed: ${error.message}</span>
            <pre>${JSON.stringify(error, null, 2)}</pre>
        `;
        return false;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Display AWS configuration
    const configDisplay = document.getElementById('aws-config-display');
    try {
        // Create a sanitized version of the config (mask sensitive info)
        const sanitizedConfig = JSON.parse(JSON.stringify(awsConfig));
        if (sanitizedConfig.Auth && sanitizedConfig.Auth.userPoolWebClientId) {
            sanitizedConfig.Auth.userPoolWebClientId = sanitizedConfig.Auth.userPoolWebClientId.substring(0, 4) + '...[MASKED]';
        }
        if (sanitizedConfig.API && sanitizedConfig.API.apiKey) {
            sanitizedConfig.API.apiKey = sanitizedConfig.API.apiKey.substring(0, 4) + '...[MASKED]';
        }
        
        configDisplay.textContent = JSON.stringify(sanitizedConfig, null, 2);
    } catch (error) {
        configDisplay.textContent = `Error displaying AWS configuration: ${error.message}`;
    }
    
    // Add event listeners to test buttons
    document.getElementById('test-api-btn').addEventListener('click', testApiConnection);
    document.getElementById('test-message-btn').addEventListener('click', testMessageCreation);
});
