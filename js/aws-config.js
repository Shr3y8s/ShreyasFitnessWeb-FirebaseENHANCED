// AWS Amplify Configuration
const awsConfig = {
    Auth: {
        region: 'us-west-2',
        userPoolId: 'us-west-2_SD0YbxB9Q',
        userPoolWebClientId: '2ji6bj5jv37ttkvcf07qli2hq3',
    },
    API: {
        graphql_endpoint: 'https://iduqgyvsabe67hmqaefo5hmv2i.appsync-api.us-west-2.amazonaws.com/graphql',
        apiKey: 'da2-pnnfdvpemncz7kjq3weag7zzdi', // API key for unauthenticated access
        graphql_headers: async () => {
            try {
                const session = await Amplify.Auth.currentSession();
                return {
                    Authorization: session.getIdToken().getJwtToken()
                };
            } catch (e) {
                console.error('Error getting current session: ', e);
                return {};
            }
        }
    }
};

// Export the configuration for use in other modules
export default awsConfig;
