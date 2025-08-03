// Authentication Handler for Shrey's Fitness Web
import { Amplify, Auth } from 'https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/+esm';
import awsConfig from './aws-config.js';

// Initialize Amplify with our configuration
Amplify.configure(awsConfig);

// Authentication functions
const AuthHandler = {
    // Sign up a new user
    async signUp(username, password, name, phoneNumber) {
        try {
            const attributes = {
                name,
                email: username, // Email and username are the same
            };
            
            // Add phone number if provided
            if (phoneNumber) {
                attributes.phone_number = phoneNumber;
            }
            
            console.log('Auth.js: Signing up with attributes:', JSON.stringify({
                username,
                attributes
                // Not logging password for security
            }));
            
            const { user } = await Auth.signUp({
                username, // This will be the email
                password,
                attributes
            });
            console.log('Sign up successful:', user);
            return { success: true, user };
        } catch (error) {
            console.error('Error signing up:', error);
            return { success: false, error: error.message || 'An error occurred during signup' };
        }
    },

    // Confirm signup with verification code
    async confirmSignUp(username, code) {
        try {
            await Auth.confirmSignUp(username, code);
            console.log('Signup confirmed successfully');
            return { success: true };
        } catch (error) {
            console.error('Error confirming signup:', error);
            return { success: false, error: error.message || 'An error occurred during confirmation' };
        }
    },

    // Sign in a user
    async signIn(username, password) {
        try {
            const user = await Auth.signIn(username, password);
            console.log('Sign in successful:', user);
            return { success: true, user };
        } catch (error) {
            console.error('Error signing in:', error);
            return { success: false, error: error.message || 'An error occurred during sign in' };
        }
    },

    // Sign out the current user
    async signOut() {
        try {
            await Auth.signOut();
            console.log('Sign out successful');
            return { success: true };
        } catch (error) {
            console.error('Error signing out:', error);
            return { success: false, error: error.message || 'An error occurred during sign out' };
        }
    },

    // Check if a user is currently signed in
    async currentAuthenticatedUser() {
        try {
            const user = await Auth.currentAuthenticatedUser();
            console.log('Current authenticated user:', user);
            return { success: true, user };
        } catch (error) {
            console.log('No authenticated user');
            return { success: false, error: 'No authenticated user' };
        }
    },

    // Check if the current user belongs to a specific group
    async isUserInGroup(group) {
        try {
            const user = await Auth.currentAuthenticatedUser();
            const groups = user.signInUserSession.accessToken.payload['cognito:groups'] || [];
            return groups.includes(group);
        } catch (error) {
            console.error('Error checking user group:', error);
            return false;
        }
    },

    // Check if the current user is a coach
    async isCoach() {
        return this.isUserInGroup('coaches');
    },

    // Check if the current user is a client
    async isClient() {
        return this.isUserInGroup('clients');
    }
};

export default AuthHandler;
