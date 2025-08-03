// Mock AWS Amplify Implementation
// This file provides a mock implementation of AWS Amplify for local development

// Create the Amplify object
const amplifyMock = {
    version: '5.0.4-mock',
    
    configure: function(config) {
        console.log('Mock Amplify configured with:', config);
        this.config = config;
    },
    
    Auth: {
        signUp: async function(params) {
            console.log('Mock Auth.signUp called with:', params);
            return {
                user: {
                    username: params.username,
                    attributes: params.attributes
                }
            };
        },
        
        signIn: async function(username, password) {
            console.log('Mock Auth.signIn called with:', username, password);
            return {
                username: username,
                attributes: {
                    name: 'Test User',
                    email: username
                }
            };
        },
        
        currentSession: async function() {
            return {
                getIdToken: function() {
                    return {
                        payload: {},
                        getJwtToken: function() {
                            return 'mock-jwt-token';
                        }
                    };
                }
            };
        },
        
        currentAuthenticatedUser: async function() {
            return {
                username: 'test@example.com',
                attributes: {
                    name: 'Test User',
                    email: 'test@example.com'
                }
            };
        },
        
        signOut: async function() {
            console.log('Mock Auth.signOut called');
            return {};
        }
    },
    
    API: {
        graphql: async function(params) {
            console.log('Mock API.graphql called with:', params);
            
            // Handle different query types
            if (params.query.includes('createMessage')) {
                return {
                    data: {
                        createMessage: {
                            id: 'mock-id-' + Date.now(),
                            senderName: params.variables.input.senderName,
                            senderEmail: params.variables.input.senderEmail,
                            subject: params.variables.input.subject,
                            content: params.variables.input.content,
                            read: false,
                            archived: false,
                            createdAt: new Date().toISOString()
                        }
                    }
                };
            } else if (params.query.includes('listMessages')) {
                return {
                    data: {
                        listMessages: {
                            items: [
                                {
                                    id: 'mock-id-1',
                                    senderName: 'John Doe',
                                    senderEmail: 'john@example.com',
                                    subject: 'Interested in Personal Training',
                                    content: 'I would like to learn more about your personal training services.',
                                    read: false,
                                    archived: false,
                                    createdAt: new Date().toISOString()
                                },
                                {
                                    id: 'mock-id-2',
                                    senderName: 'Jane Smith',
                                    senderEmail: 'jane@example.com',
                                    subject: 'Online Coaching Inquiry',
                                    content: 'I am interested in your online coaching program. Can you provide more details?',
                                    read: true,
                                    archived: false,
                                    createdAt: new Date(Date.now() - 86400000).toISOString()
                                }
                            ]
                        }
                    }
                };
            }
            
            // Default response
            return {
                data: {}
            };
        }
    }
};

// Make it available globally
window.Amplify = amplifyMock;
window.amplifyMock = amplifyMock;

console.log('AWS Amplify mock loaded successfully');
console.log('Amplify version:', amplifyMock.version);
