// AWS Amplify Configuration for v6
const awsConfig = {
    // Auth configuration for Cognito User Pools
    Auth: {
        Cognito: {
            region: 'us-west-2',
            userPoolId: 'us-west-2_SD0YbxB9Q',
            userPoolClientId: '2ji6bj5jv37ttkvcf07qli2hq3',
            identityPoolId: 'us-west-2:3dcedf34-457f-4c69-beac-64d4041e6caa',
            allowGuestAccess: true, // equivalent to !mandatorySignIn
            loginWith: {
                email: true,
                phone: true,
                username: true
            }
        }
    },
    // API configuration for AppSync GraphQL
    API: {
        GraphQL: {
            endpoint: 'https://iduqgyvsabe67hmqaefo5hmv2i.appsync-api.us-west-2.amazonaws.com/graphql',
            region: 'us-west-2',
            defaultAuthMode: 'API_KEY',
            apiKey: 'da2-3tbvylc35rdeln4pguofotsjuu',
            // Custom auth headers function
            authHeaders: async () => {
                try {
                    // Check if user is authenticated by looking for LastAuthUser in localStorage
                    const clientId = '2ji6bj5jv37ttkvcf07qli2hq3';
                    const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);
                    
                    if (lastAuthUser) {
                        // Get the ID token from storage
                        const idTokenKey = `CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`;
                        const idToken = localStorage.getItem(idTokenKey);
                        
                        if (idToken) {
                            return {
                                Authorization: idToken
                            };
                        }
                    }
                    
                    // Fall back to API key if no valid token found
                    console.log('No current user session found, using API key');
                    return {
                        'x-api-key': 'da2-3tbvylc35rdeln4pguofotsjuu'
                    };
                } catch (error) {
                    console.log('Error getting authentication headers:', error);
                    return {
                        'x-api-key': 'da2-3tbvylc35rdeln4pguofotsjuu'
                    };
                }
            }
        },
        // For backward compatibility, maintain the REST endpoints structure
        REST: {
            shreyasfitnessweb: {
                endpoint: 'https://iduqgyvsabe67hmqaefo5hmv2i.appsync-api.us-west-2.amazonaws.com/graphql',
                region: 'us-west-2'
            }
        }
    }
};

// Export for ES modules
if (typeof exports !== 'undefined') {
    exports.default = awsConfig;
}

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.awsConfig = awsConfig;
    console.log("AWS Config loaded successfully");
}
