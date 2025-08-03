#!/bin/bash

# Script to fix the AWS Amplify mock implementation issue
# This script will download the real AWS Amplify library and create a backup of the mock implementation

echo "=== AWS Amplify Mock Implementation Fix ==="
echo "This script will:"
echo "1. Create a backup of your current mock implementation"
echo "2. Download the real AWS Amplify library from CDN"
echo "3. Replace the mock implementation with the real library"
echo ""

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo "Error: curl is not installed. Please install curl and try again."
    exit 1
fi

# Create backup directory if it doesn't exist
if [ ! -d "js/backup" ]; then
    echo "Creating backup directory..."
    mkdir -p js/backup
fi

# Backup the current mock implementation
echo "Creating backup of current mock implementation..."
if [ -f "js/amplify-bundle.min.js" ]; then
    cp js/amplify-bundle.min.js js/backup/amplify-bundle.min.js.bak
    echo "Backup created at js/backup/amplify-bundle.min.js.bak"
else
    echo "Warning: js/amplify-bundle.min.js not found. Skipping backup."
fi

# Download the real AWS Amplify library
echo "Downloading real AWS Amplify library from CDN..."
curl -o js/amplify-bundle.min.js https://cdn.jsdelivr.net/npm/aws-amplify@5.3.11/dist/aws-amplify.min.js

# Check if download was successful
if [ $? -eq 0 ]; then
    echo "Download successful!"
    echo "Real AWS Amplify library has been saved to js/amplify-bundle.min.js"
else
    echo "Error: Failed to download AWS Amplify library."
    echo "Please check your internet connection and try again."
    
    # Restore backup if download failed
    if [ -f "js/backup/amplify-bundle.min.js.bak" ]; then
        echo "Restoring backup..."
        cp js/backup/amplify-bundle.min.js.bak js/amplify-bundle.min.js
        echo "Backup restored."
    fi
    
    exit 1
fi

echo ""
echo "=== Next Steps ==="
echo "You need to update your JavaScript code to use the correct namespace:"
echo "1. Change 'window.Amplify.configure(...)' to 'Amplify.configure(...)'"
echo "2. Change 'window.Amplify.API.graphql(...)' to 'Amplify.API.graphql(...)'"
echo ""
echo "For more information, please refer to the AMPLIFY_MOCK_ISSUE.md file."
echo ""
echo "=== Testing ==="
echo "To test if the fix works:"
echo "1. Open real-amplify-test.html in your browser"
echo "2. Click 'Send Test Message' to create a test message"
echo "3. Click 'Fetch Messages' to retrieve messages from the database"
echo "4. Check your DynamoDB table in the AWS Console to confirm the message was stored"
echo ""
echo "Fix completed successfully!"
