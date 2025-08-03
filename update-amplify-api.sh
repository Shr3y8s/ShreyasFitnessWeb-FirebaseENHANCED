#!/bin/bash

# This script updates the Amplify API configuration to add API key authentication

echo "Updating Amplify API configuration..."

# Create a temporary file for the API update
cat > api-update.json << EOL
{
  "version": 1,
  "serviceConfiguration": {
    "apiName": "shreyasfitnessweb",
    "serviceName": "AppSync",
    "defaultAuthType": {
      "mode": "AMAZON_COGNITO_USER_POOLS",
      "cognitoUserPoolId": "authshreyasfitnessweb215ca8f0"
    },
    "additionalAuthTypes": [
      {
        "mode": "API_KEY",
        "expirationTime": 365,
        "apiKeyExpirationDate": "2026-08-03T00:00:00.000Z",
        "keyDescription": "API key for unauthenticated access"
      }
    ],
    "conflictResolution": {}
  }
}
EOL

echo "Running amplify update api..."
amplify update api

echo "Pushing changes to AWS..."
amplify push --yes

echo "API configuration updated successfully!"
echo "Please check the AWS AppSync console to get the new API key."
echo "Then update the aws-config.js file with the new API key."
