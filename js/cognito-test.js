// AWS Cognito Test Script
import { Auth } from 'aws-amplify';
import awsConfig from './aws-config.js';

// Initialize Amplify with our configuration
Auth.configure(awsConfig);

// Function to test AWS Cognito configuration
async function testCognitoConfig() {
    console.log('Testing AWS Cognito Configuration...');
    console.log('AWS Config:', JSON.stringify(awsConfig, null, 2));
    
    try {
        // Test if we can get the current session (will fail if not logged in, which is expected)
        try {
            const session = await Auth.currentSession();
            console.log('Current session found:', session);
        } catch (e) {
            console.log('No current session (expected if not logged in):', e.message);
        }
        
        // Test if we can get the current user (will fail if not logged in, which is expected)
        try {
            const user = await Auth.currentAuthenticatedUser();
            console.log('Current user found:', user);
        } catch (e) {
            console.log('No authenticated user (expected if not logged in):', e.message);
        }
        
        // Test if we can get the current credentials (will fail if not logged in, which is expected)
        try {
            const credentials = await Auth.currentCredentials();
            console.log('Current credentials found:', credentials);
        } catch (e) {
            console.log('No current credentials (expected if not logged in):', e.message);
        }
        
        // Test if we can get the current user info (will fail if not logged in, which is expected)
        try {
            const userInfo = await Auth.currentUserInfo();
            console.log('Current user info found:', userInfo);
        } catch (e) {
            console.log('No current user info (expected if not logged in):', e.message);
        }
        
        console.log('AWS Cognito Configuration Test Complete');
        console.log('If you see no unexpected errors above, the configuration is likely correct.');
        console.log('Next step: Try signing up with a test account to verify email verification works.');
    } catch (error) {
        console.error('Error testing AWS Cognito configuration:', error);
    }
}

// Run the test
testCognitoConfig();
