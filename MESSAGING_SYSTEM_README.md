# SHREY.FIT Messaging System

This document provides instructions on how to set up and use the messaging system for the SHREY.FIT website.

## Overview

The messaging system allows users to send messages through the contact form on the website. These messages are stored in AWS DynamoDB and can be viewed by coaches through the Coach Dashboard.

## Setup Instructions

### 1. AWS AppSync API Key

The messaging system requires an API key for unauthenticated API calls. To set up the API key:

1. Log in to the AWS Management Console
2. Navigate to AWS AppSync
3. Select your API (the GraphQL API for SHREY.FIT)
4. Go to the "Settings" tab
5. Under "API Keys", create a new API key or use an existing one
6. Copy the API key value

### 2. Update AWS Configuration

Update the `js/aws-config.js` file with your API key:

```javascript
API: {
    graphql_endpoint: 'https://your-api-endpoint.appsync-api.region.amazonaws.com/graphql',
    apiKey: 'your-api-key-here', // Replace with your actual API key from AWS AppSync
    // ... other configuration
}
```

### 3. Test the Configuration

Use the AWS Configuration Checker to verify that your setup is working correctly:

1. Open `aws-config-checker.html` in your browser
2. Check that the API key is detected
3. Test the API connection
4. Test message creation

## Using the Messaging System

### Sending Messages (Users)

Users can send messages through the contact form:

1. Navigate to `connect.html`
2. Click on "Send a Message"
3. Fill out the form and submit

### Viewing Messages (Coaches)

Coaches can view messages through the Coach Dashboard:

1. Log in as a coach user
2. Navigate to `coach-dashboard.html`
3. Messages will be displayed in the Messages tab

## Troubleshooting

### Message Sending Issues

If users are unable to send messages:

1. Check that the API key is correctly configured in `js/aws-config.js`
2. Verify that the GraphQL endpoint is correct
3. Ensure that the schema allows unauthenticated message creation
4. Use the AWS Configuration Checker to diagnose issues

### Message Viewing Issues

If coaches are unable to view messages:

1. Verify that the user is logged in as a coach
2. Check that the user belongs to the "coaches" group in AWS Cognito
3. Ensure that the GraphQL schema allows coaches to read messages
4. Use the Coach Dashboard Debug page to diagnose issues

## Debug Tools

The following debug tools are available:

- `aws-config-checker.html`: Tests AWS configuration and API connectivity
- `coach-dashboard-debug.html`: Debug version of the coach dashboard with detailed error information
- `cors-server.js`: Local server with CORS support for testing

## AWS Schema

The GraphQL schema for messages:

```graphql
type Message @model
@auth(rules: [
  { allow: groups, groups: ["coaches"], operations: [create, read, update, delete] },
  { allow: owner, operations: [create, read] }
]) {
  id: ID!
  senderName: String!
  senderEmail: String!
  subject: String!
  content: String!
  read: Boolean!
  archived: Boolean!
  createdAt: AWSDateTime!
}
```

This schema allows:
- Anyone with an API key to create messages
- Coaches to read, update, and delete messages
- Message owners to read their own messages

## Security Considerations

- The API key should be kept secure and rotated regularly
- Consider implementing rate limiting to prevent abuse
- Validate user input to prevent injection attacks
- Monitor AWS CloudWatch logs for unusual activity
