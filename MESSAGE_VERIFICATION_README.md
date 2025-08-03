# Message Verification Tools

This directory contains several tools to help you verify that messages from your contact form are being properly stored in your AWS backend.

## 1. AWS Amplify API Test

The `test-amplify-api.html` file provides a comprehensive test suite to verify your AWS Amplify API configuration:
- Checks if your AWS configuration is properly loaded
- Tests if AWS Amplify can be initialized with your configuration
- Verifies API connectivity
- Tests message creation through the API

### How to use:

1. Open the file in your web browser:
   ```
   open test-amplify-api.html
   ```
   or simply double-click the file in your file explorer

2. Click through each test button in sequence:
   - First "Check AWS Config" to verify your configuration
   - Then "Initialize Amplify" to set up the Amplify library
   - Next "Test API Connectivity" to check if your API is accessible
   - Finally "Test Message Creation" to verify message storage

This tool provides detailed error messages and troubleshooting tips if any tests fail.

## 2. Web-based Message Viewer

The `message-storage-test.html` file provides a web-based interface to:
- Fetch and display all messages stored in your AWS backend
- Send test messages to verify the storage functionality

### How to use:

1. Open the file in your web browser:
   ```
   open message-storage-test.html
   ```
   or simply double-click the file in your file explorer

2. Click the "Fetch Messages" button to retrieve and display all stored messages
3. If no messages are found, you can click "Send Test Message" to create a test message

This tool uses the same AWS Amplify configuration and API as your contact form, so it's a good way to verify that your setup is working correctly.

## 3. Node.js Script

The `check-messages.js` file is a Node.js script that directly queries your DynamoDB table to check for messages.

### Prerequisites:

- Node.js installed
- AWS SDK for JavaScript installed (`npm install aws-sdk`)
- AWS credentials configured

### How to use:

1. Run the script:
   ```
   node check-messages.js
   ```

2. Optionally, specify a different table name:
   ```
   MESSAGE_TABLE_NAME=YourTableName node check-messages.js
   ```

This script reads your AWS configuration from `js/aws-config.js` but requires AWS credentials to be configured separately.

## 4. Shell Script

The `check-messages.sh` file is a shell script that uses the AWS CLI to query your DynamoDB table.

### Prerequisites:

- AWS CLI installed and configured

### How to use:

1. Make the script executable:
   ```
   chmod +x check-messages.sh
   ```

2. Run the script:
   ```
   ./check-messages.sh
   ```

3. Optionally, specify a different table name:
   ```
   ./check-messages.sh YourTableName
   ```

This script requires the AWS CLI to be installed and configured with appropriate credentials.

## Troubleshooting

If you're not seeing any messages:

1. **Check your AWS credentials**: Make sure you're using the correct AWS account and region.
2. **Verify the table name**: The default table name is set to `Message-ucxyfxymdSeftmpcx6ljfb734i-dev`. If your table has a different name, update it in the scripts.
3. **Check API permissions**: Ensure your API key has permission to read from the DynamoDB table.
4. **Test with a new message**: Use the contact form or the "Send Test Message" button to create a new message and then check if it appears.
5. **Check the AWS Console**: Log into the AWS Console and check the DynamoDB table directly.

## AWS AppSync Console

You can also use the AWS AppSync Console to run GraphQL queries:

1. Log into the AWS Management Console
2. Navigate to AWS AppSync
3. Select your API
4. Go to the Queries tab
5. Run this query:
   ```graphql
   query ListMessages {
     listMessages(limit: 10) {
       items {
         id
         senderName
         senderEmail
         subject
         content
         createdAt
       }
     }
   }
   ```
