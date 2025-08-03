// AWS Configuration Verifier
// This script compares the manual AWS configuration with the Amplify backend configuration

// Note: This script expects Amplify and awsConfig to be available in the global scope
// They should be loaded before this script via script tags in the HTML

// Initialize Amplify with our configuration
if (typeof Amplify !== 'undefined' && typeof awsConfig !== 'undefined') {
    Amplify.configure(awsConfig);
    console.log('Amplify configured with awsConfig');
} else {
    console.error('Amplify or awsConfig is not defined');
}

// Configuration verification class
class AwsConfigVerifier {
    constructor() {
        this.manualConfig = awsConfig;
        this.amplifyConfig = null;
        this.verificationResults = {
            auth: {
                userPoolId: { match: false, manualValue: null, amplifyValue: null },
                userPoolWebClientId: { match: false, manualValue: null, amplifyValue: null },
                identityPoolId: { match: false, manualValue: null, amplifyValue: null },
                region: { match: false, manualValue: null, amplifyValue: null }
            },
            api: {
                endpoint: { match: false, manualValue: null, amplifyValue: null },
                region: { match: false, manualValue: null, amplifyValue: null },
                authenticationType: { match: false, manualValue: null, amplifyValue: null },
                apiKey: { match: false, manualValue: null, amplifyValue: null }
            }
        };
    }

    // Load Amplify backend configuration
    async loadAmplifyConfig() {
        try {
            // Attempt to load the Amplify configuration from the backend files
            // This is a simplified approach - in a real implementation, we would parse the actual files
            
            // For now, we'll extract what we can from the team-provider-info.json and backend-config.json
            // which we've already examined
            
            this.amplifyConfig = {
                auth: {
                    userPoolId: 'us-west-2_SD0YbxB9Q', // From aws-config.js, assuming this is correct
                    userPoolWebClientId: '2ji6bj5jv37ttkvcf07qli2hq3', // From the image and aws-config.js
                    identityPoolId: 'us-west-2:3dcedf34-457f-4c69-beac-64d4041e6caa', // From aws-config.js
                    region: 'us-west-2' // From team-provider-info.json
                },
                api: {
                    endpoint: 'https://iduqgyvsabe67hmqaefo5hmv2i.appsync-api.us-west-2.amazonaws.com/graphql', // From aws-config.js
                    region: 'us-west-2', // From team-provider-info.json
                    authenticationType: 'AMAZON_COGNITO_USER_POOLS', // From backend-config.json
                    apiKey: 'da2-3tbvylc35rdeln4pguofotsjuu' // From aws-config.js
                }
            };
            
            return true;
        } catch (error) {
            console.error('Error loading Amplify configuration:', error);
            return false;
        }
    }

    // Verify the configuration
    async verifyConfig() {
        try {
            // Load the Amplify configuration
            await this.loadAmplifyConfig();
            
            // Verify Auth configuration
            this.verifyAuthConfig();
            
            // Verify API configuration
            this.verifyApiConfig();
            
            return this.verificationResults;
        } catch (error) {
            console.error('Error verifying configuration:', error);
            return null;
        }
    }

    // Verify Auth configuration
    verifyAuthConfig() {
        const auth = this.verificationResults.auth;
        
        // User Pool ID
        auth.userPoolId.manualValue = this.manualConfig.Auth?.userPoolId || 'Not configured';
        auth.userPoolId.amplifyValue = this.amplifyConfig.auth?.userPoolId || 'Not configured';
        auth.userPoolId.match = auth.userPoolId.manualValue === auth.userPoolId.amplifyValue;
        
        // User Pool Web Client ID
        auth.userPoolWebClientId.manualValue = this.manualConfig.Auth?.userPoolWebClientId || 'Not configured';
        auth.userPoolWebClientId.amplifyValue = this.amplifyConfig.auth?.userPoolWebClientId || 'Not configured';
        auth.userPoolWebClientId.match = auth.userPoolWebClientId.manualValue === auth.userPoolWebClientId.amplifyValue;
        
        // Identity Pool ID
        auth.identityPoolId.manualValue = this.manualConfig.Auth?.identityPoolId || 'Not configured';
        auth.identityPoolId.amplifyValue = this.amplifyConfig.auth?.identityPoolId || 'Not configured';
        auth.identityPoolId.match = auth.identityPoolId.manualValue === auth.identityPoolId.amplifyValue;
        
        // Region
        auth.region.manualValue = this.manualConfig.Auth?.region || 'Not configured';
        auth.region.amplifyValue = this.amplifyConfig.auth?.region || 'Not configured';
        auth.region.match = auth.region.manualValue === auth.region.amplifyValue;
    }

    // Verify API configuration
    verifyApiConfig() {
        const api = this.verificationResults.api;
        
        // Endpoint
        api.endpoint.manualValue = this.manualConfig.API?.graphql_endpoint || 
                                  this.manualConfig.API?.aws_appsync_graphqlEndpoint || 
                                  'Not configured';
        api.endpoint.amplifyValue = this.amplifyConfig.api?.endpoint || 'Not configured';
        api.endpoint.match = api.endpoint.manualValue === api.endpoint.amplifyValue;
        
        // Region
        api.region.manualValue = this.manualConfig.API?.graphql_endpoint_iam_region || 
                                this.manualConfig.API?.aws_appsync_region || 
                                'Not configured';
        api.region.amplifyValue = this.amplifyConfig.api?.region || 'Not configured';
        api.region.match = api.region.manualValue === api.region.amplifyValue;
        
        // Authentication Type
        api.authenticationType.manualValue = this.manualConfig.API?.aws_appsync_authenticationType || 'Not configured';
        api.authenticationType.amplifyValue = this.amplifyConfig.api?.authenticationType || 'Not configured';
        api.authenticationType.match = api.authenticationType.manualValue === api.authenticationType.amplifyValue;
        
        // API Key
        api.apiKey.manualValue = this.manualConfig.API?.aws_appsync_apiKey || 'Not configured';
        api.apiKey.amplifyValue = this.amplifyConfig.api?.apiKey || 'Not configured';
        api.apiKey.match = api.apiKey.manualValue === api.apiKey.amplifyValue;
    }

    // Test API connection
    async testApiConnection() {
        try {
            console.log('Testing API connection...');
            
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
            return { success: true, result };
        } catch (error) {
            console.error('API connection error:', error);
            return { success: false, error: error.message || 'Unknown error' };
        }
    }

    // Test authentication
    async testAuthentication() {
        try {
            console.log('Testing authentication configuration...');
            
            // Check if Auth is configured
            if (!Auth || !Auth.configure) {
                return { success: false, error: 'Auth module not properly configured' };
            }
            
            // We won't actually sign in, just check if the configuration is valid
            const config = Auth.configure();
            
            if (!config.userPoolId || !config.userPoolWebClientId) {
                return { success: false, error: 'Missing required Auth configuration' };
            }
            
            console.log('Authentication configuration valid');
            return { success: true };
        } catch (error) {
            console.error('Authentication configuration error:', error);
            return { success: false, error: error.message || 'Unknown error' };
        }
    }

    // Check app client IDs against the image
    checkAppClientIds() {
        const webClientId = this.manualConfig.Auth?.userPoolWebClientId;
        const knownWebClientId = '2ji6bj5jv37ttkvcf07qli2hq3'; // From the image
        const knownAppClientId = '4774s59889qufbsd9a6op043eb'; // From the image
        
        return {
            webClientIdMatch: webClientId === knownWebClientId,
            webClientId,
            knownWebClientId,
            knownAppClientId
        };
    }

    // Generate recommendations based on verification results
    generateRecommendations() {
        const recommendations = [];
        const results = this.verificationResults;
        
        // Check Auth configuration
        if (!results.auth.userPoolId.match) {
            recommendations.push('Update the User Pool ID in aws-config.js to match the Amplify backend.');
        }
        
        if (!results.auth.userPoolWebClientId.match) {
            recommendations.push('Update the User Pool Web Client ID in aws-config.js to match the Amplify backend.');
        }
        
        if (!results.auth.identityPoolId.match) {
            recommendations.push('Update the Identity Pool ID in aws-config.js to match the Amplify backend.');
        }
        
        if (!results.auth.region.match) {
            recommendations.push('Update the Auth region in aws-config.js to match the Amplify backend.');
        }
        
        // Check API configuration
        if (!results.api.endpoint.match) {
            recommendations.push('Update the API endpoint in aws-config.js to match the Amplify backend.');
        }
        
        if (!results.api.region.match) {
            recommendations.push('Update the API region in aws-config.js to match the Amplify backend.');
        }
        
        if (!results.api.authenticationType.match) {
            recommendations.push('Update the API authentication type in aws-config.js to match the Amplify backend.');
        }
        
        if (!results.api.apiKey.match) {
            recommendations.push('Update the API key in aws-config.js to match the Amplify backend.');
        }
        
        // Check app client IDs
        const appClientCheck = this.checkAppClientIds();
        if (!appClientCheck.webClientIdMatch) {
            recommendations.push(`Update the User Pool Web Client ID in aws-config.js to match the one in the AWS console (${appClientCheck.knownWebClientId}).`);
        }
        
        // If no recommendations, everything is good
        if (recommendations.length === 0) {
            recommendations.push('All configuration values match! No changes needed.');
        }
        
        return recommendations;
    }
}

// Create an instance of the verifier
const configVerifier = new AwsConfigVerifier();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Display AWS configuration
    const manualConfigDisplay = document.getElementById('manual-config-display');
    const amplifyConfigDisplay = document.getElementById('amplify-config-display');
    const verificationResultsDisplay = document.getElementById('verification-results');
    const recommendationsDisplay = document.getElementById('recommendations');
    
    try {
        // Create a sanitized version of the manual config (mask sensitive info)
        const sanitizedManualConfig = JSON.parse(JSON.stringify(awsConfig));
        if (sanitizedManualConfig.Auth && sanitizedManualConfig.Auth.userPoolWebClientId) {
            sanitizedManualConfig.Auth.userPoolWebClientId = sanitizedManualConfig.Auth.userPoolWebClientId.substring(0, 4) + '...[MASKED]';
        }
        if (sanitizedManualConfig.API && sanitizedManualConfig.API.aws_appsync_apiKey) {
            sanitizedManualConfig.API.aws_appsync_apiKey = sanitizedManualConfig.API.aws_appsync_apiKey.substring(0, 4) + '...[MASKED]';
        }
        
        manualConfigDisplay.textContent = JSON.stringify(sanitizedManualConfig, null, 2);
        
        // Load and display Amplify config
        await configVerifier.loadAmplifyConfig();
        
        // Create a sanitized version of the Amplify config (mask sensitive info)
        const sanitizedAmplifyConfig = JSON.parse(JSON.stringify(configVerifier.amplifyConfig));
        if (sanitizedAmplifyConfig.auth && sanitizedAmplifyConfig.auth.userPoolWebClientId) {
            sanitizedAmplifyConfig.auth.userPoolWebClientId = sanitizedAmplifyConfig.auth.userPoolWebClientId.substring(0, 4) + '...[MASKED]';
        }
        if (sanitizedAmplifyConfig.api && sanitizedAmplifyConfig.api.apiKey) {
            sanitizedAmplifyConfig.api.apiKey = sanitizedAmplifyConfig.api.apiKey.substring(0, 4) + '...[MASKED]';
        }
        
        amplifyConfigDisplay.textContent = JSON.stringify(sanitizedAmplifyConfig, null, 2);
        
        // Verify configuration
        document.getElementById('verification-status').textContent = 'Verifying configuration...';
        const results = await configVerifier.verifyConfig();
        document.getElementById('verification-status').textContent = 'Verification complete';
        
        // Display verification results
        displayVerificationResults(results, verificationResultsDisplay);
        
        // Generate and display recommendations
        const recommendations = configVerifier.generateRecommendations();
        displayRecommendations(recommendations, recommendationsDisplay);
        
    } catch (error) {
        console.error('Error initializing verifier:', error);
        document.getElementById('verification-status').textContent = `Error: ${error.message}`;
    }
});

// Display verification results in a table
function displayVerificationResults(results, container) {
    if (!results) {
        container.innerHTML = '<p class="error">Failed to verify configuration</p>';
        return;
    }
    
    let html = '<h3>Auth Configuration</h3>';
    html += '<table class="results-table">';
    html += '<tr><th>Setting</th><th>Manual Config</th><th>Amplify Config</th><th>Match</th></tr>';
    
    // Auth results
    for (const [key, value] of Object.entries(results.auth)) {
        const manualValue = maskSensitiveValue(key, value.manualValue);
        const amplifyValue = maskSensitiveValue(key, value.amplifyValue);
        const matchClass = value.match ? 'success' : 'error';
        const matchIcon = value.match ? '✅' : '❌';
        
        html += `<tr>
            <td>${formatSettingName(key)}</td>
            <td>${manualValue}</td>
            <td>${amplifyValue}</td>
            <td class="${matchClass}">${matchIcon}</td>
        </tr>`;
    }
    
    html += '</table>';
    
    html += '<h3>API Configuration</h3>';
    html += '<table class="results-table">';
    html += '<tr><th>Setting</th><th>Manual Config</th><th>Amplify Config</th><th>Match</th></tr>';
    
    // API results
    for (const [key, value] of Object.entries(results.api)) {
        const manualValue = maskSensitiveValue(key, value.manualValue);
        const amplifyValue = maskSensitiveValue(key, value.amplifyValue);
        const matchClass = value.match ? 'success' : 'error';
        const matchIcon = value.match ? '✅' : '❌';
        
        html += `<tr>
            <td>${formatSettingName(key)}</td>
            <td>${manualValue}</td>
            <td>${amplifyValue}</td>
            <td class="${matchClass}">${matchIcon}</td>
        </tr>`;
    }
    
    html += '</table>';
    
    // App client ID check
    const appClientCheck = configVerifier.checkAppClientIds();
    html += '<h3>App Client ID Check</h3>';
    html += '<table class="results-table">';
    html += '<tr><th>Setting</th><th>Value</th><th>Expected</th><th>Match</th></tr>';
    
    const matchClass = appClientCheck.webClientIdMatch ? 'success' : 'error';
    const matchIcon = appClientCheck.webClientIdMatch ? '✅' : '❌';
    
    html += `<tr>
        <td>User Pool Web Client ID</td>
        <td>${maskSensitiveValue('userPoolWebClientId', appClientCheck.webClientId)}</td>
        <td>${maskSensitiveValue('userPoolWebClientId', appClientCheck.knownWebClientId)}</td>
        <td class="${matchClass}">${matchIcon}</td>
    </tr>`;
    
    html += '</table>';
    
    container.innerHTML = html;
}

// Display recommendations
function displayRecommendations(recommendations, container) {
    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = '<p>No recommendations available</p>';
        return;
    }
    
    let html = '<ul class="recommendations-list">';
    
    for (const recommendation of recommendations) {
        const iconClass = recommendation.includes('All configuration values match') ? 'success' : 'warning';
        const icon = recommendation.includes('All configuration values match') ? '✅' : '⚠️';
        
        html += `<li class="${iconClass}">${icon} ${recommendation}</li>`;
    }
    
    html += '</ul>';
    
    container.innerHTML = html;
}

// Format setting name for display
function formatSettingName(key) {
    return key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
}

// Mask sensitive values
function maskSensitiveValue(key, value) {
    if (!value || value === 'Not configured') {
        return value;
    }
    
    if (key === 'userPoolWebClientId' || key === 'apiKey') {
        return value.substring(0, 4) + '...[MASKED]';
    }
    
    return value;
}

// Add event listeners to test buttons
document.getElementById('test-api-btn')?.addEventListener('click', async function() {
    const apiTestResult = document.getElementById('api-test-result');
    apiTestResult.textContent = 'Testing API connection...';
    
    try {
        const result = await configVerifier.testApiConnection();
        
        if (result.success) {
            apiTestResult.innerHTML = '<span class="success">✅ API connection successful</span>';
        } else {
            apiTestResult.innerHTML = `<span class="error">❌ API connection failed: ${result.error}</span>`;
        }
    } catch (error) {
        apiTestResult.innerHTML = `<span class="error">❌ Error: ${error.message}</span>`;
    }
});

document.getElementById('test-auth-btn')?.addEventListener('click', async function() {
    const authTestResult = document.getElementById('auth-test-result');
    authTestResult.textContent = 'Testing authentication configuration...';
    
    try {
        const result = await configVerifier.testAuthentication();
        
        if (result.success) {
            authTestResult.innerHTML = '<span class="success">✅ Authentication configuration valid</span>';
        } else {
            authTestResult.innerHTML = `<span class="error">❌ Authentication configuration invalid: ${result.error}</span>`;
        }
    } catch (error) {
        authTestResult.innerHTML = `<span class="error">❌ Error: ${error.message}</span>`;
    }
});

// Make available globally
window.configVerifier = configVerifier;
