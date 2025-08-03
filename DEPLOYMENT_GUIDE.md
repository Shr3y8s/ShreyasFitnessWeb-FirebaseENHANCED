# Deployment Guide for SHREY.FIT

This guide explains how to deploy your AWS Amplify backend and test the functionality.

## Prerequisites

1. AWS CLI installed and configured with your AWS credentials
2. Amplify CLI installed globally (`npm install -g @aws-amplify/cli`)
3. Node.js and npm installed

## Step 1: Deploy the Backend to AWS

1. Make the update script executable:
   ```bash
   chmod +x update-amplify-api.sh
   ```

2. Run the update script to add API key authentication to your API:
   ```bash
   ./update-amplify-api.sh
   ```

   This script will:
   - Update your API configuration to add API key authentication
   - Push the changes to AWS
   - Generate a new API key

3. After running the script, go to the AWS AppSync console to get the new API key:
   - Sign in to the AWS Management Console
   - Navigate to AWS AppSync
   - Select your API (shreyasfitnessweb)
   - Go to "Settings"
   - Find the API key in the "API Keys" section

4. Update your `js/aws-config.js` file with the new API key:
   ```javascript
   aws_appsync_apiKey: 'your-new-api-key',
   ```

## Step 2: Test the Contact Form

1. Start your local development server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to http://localhost:3000/connect.html
3. Fill out the contact form and submit it
4. Check the console for any errors
5. Verify that the message was stored in your database:
   - Go to the AWS AppSync console
   - Select your API
   - Go to "Queries"
   - Run a query to list all messages:
     ```graphql
     query ListMessages {
       listMessages {
         items {
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
     }
     ```

## Step 3: Test the Signup Functionality

1. Open your browser and navigate to http://localhost:3000/signup.html
2. Fill out the signup form and submit it
3. Check your email for a verification code
4. Go to http://localhost:3000/account.html and enter the verification code
5. Log in with your email and password

## Step 4: Add Yourself to the Coaches Group

1. Sign in to the AWS Management Console
2. Navigate to Amazon Cognito > User Pools
3. Select your user pool (shreyasfitnessweb215ca8f0)
4. Go to "Users and groups"
5. Find your user (search by email)
6. Click on your user and select "Add to group"
7. Select the "coaches" group and confirm

## Step 5: Test the Coach Dashboard

1. Log in to your account at http://localhost:3000/account.html
2. You should be redirected to the coach dashboard
3. Verify that you can see the messages submitted through the contact form

## Troubleshooting

### Email Verification Not Working

If you're not receiving verification emails:

1. Check your spam/junk folder
2. Verify that your Cognito User Pool has email verification enabled:
   - Go to the AWS Cognito console
   - Select your user pool
   - Go to "Message customizations"
   - Ensure that "Email" is selected as a verification method

### API Key Authentication Issues

If you're getting "Not Authorized" errors when submitting the contact form:

1. Check that your API key is valid and not expired
2. Verify that your API has API key authentication enabled:
   - Go to the AWS AppSync console
   - Select your API
   - Go to "Settings"
   - Verify that "API Key" is listed under "Additional Authentication Providers"

### Cognito User Pool Issues

If you're having issues with user authentication:

1. Verify that your Cognito User Pool is properly configured:
   - Go to the AWS Cognito console
   - Select your user pool
   - Go to "App clients"
   - Verify that your app client has the correct settings

## Production Deployment

When you're ready to deploy to production:

1. Update your domain settings in the AWS Amplify console
2. Configure your custom domain if needed
3. Update your CORS settings if needed (using CloudFront)
4. Test the production deployment thoroughly
