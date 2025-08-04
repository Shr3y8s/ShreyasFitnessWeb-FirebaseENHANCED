# SHREY.FIT Message Feature: Design and Architecture Document

## 1. Executive Summary

This document outlines the design and architecture for implementing a message submission and retrieval system for the SHREY.FIT website using AWS Amplify Gen 2. The system will enable potential clients to submit inquiries through the existing contact form on the connect.html page, store these messages securely in the cloud, and provide the fitness coach with an admin interface to view and manage incoming messages.

## 2. System Overview

### 2.1 Current State

The SHREY.FIT website currently has a static HTML/CSS/JavaScript implementation with a contact form on the connect.html page. The form collects the following information:
- Name (required)
- Email (required)
- Phone (optional)
- Service interest (required, dropdown selection)
- Message content (required)
- Newsletter subscription (optional, checkbox)

Currently, the form submission is handled by client-side JavaScript that displays a success message but does not actually store or transmit the data.

### 2.2 Target State

The enhanced system will:
1. Securely store submitted messages in AWS cloud storage
2. Provide an admin interface for the fitness coach to view messages
3. Implement authentication to protect access to stored messages
4. Allow for future extension to additional features (client accounts, appointments, etc.)

## 3. Architecture

### 3.1 High-Level Architecture Diagram

```
+-------------------+      +-----------------+      +-------------------+
|                   |      |                 |      |                   |
|  Client Browser   +----->+  AWS AppSync    +----->+  Amazon DynamoDB  |
|  (connect.html)   |      |  GraphQL API    |      |  (Message Table)  |
|                   |      |                 |      |                   |
+-------------------+      +-----------------+      +-------------------+
                                   ^
                                   |
                                   v
+-------------------+      +-----------------+
|                   |      |                 |
|  Admin Browser    +----->+  Amazon Cognito |
|  (admin.html)     |      |  (Auth Service) |
|                   |      |                 |
+-------------------+      +-----------------+
```

### 3.2 Component Architecture

```
Client-Side Components:
+--------------------+     +--------------------+     +--------------------+
|                    |     |                    |     |                    |
|  Contact Form UI   +---->+  Form Validation   +---->+  Amplify API Client|
|  (connect.html)    |     |  (JavaScript)      |     |  (aws-amplify/api) |
|                    |     |                    |     |                    |
+--------------------+     +--------------------+     +----------+---------+
                                                                 |
                                                                 v
Server-Side Components:                           +---------------v---------+
+--------------------+     +--------------------+ |                         |
|                    |     |                    | |   AWS AppSync Service   |
|  GraphQL Schema    +---->+  DynamoDB Table    +<+   (GraphQL Endpoint)    |
|  (Message Type)    |     |  (Messages)        | |                         |
|                    |     |                    | +-------------------------+
+--------------------+     +--------------------+

Admin Components:
+--------------------+     +--------------------+     +--------------------+
|                    |     |                    |     |                    |
|  Admin Dashboard   +---->+  Auth Components   +---->+  Message Display   |
|  (admin.html)      |     |  (aws-amplify/auth)|     |  Components        |
|                    |     |                    |     |                    |
+--------------------+     +--------------------+     +--------------------+
```

## 4. Data Model

### 4.1 Message Schema

The Message model will be defined in TypeScript using AWS Amplify Gen 2:

```typescript
export const schema = a.schema({
  Message: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      email: a.string().required(),
      phone: a.string(),
      service: a.string().required(),
      message: a.string().required(),
      newsletter: a.boolean().default(false),
      status: a.enum(['NEW', 'READ', 'REPLIED']).default('NEW'),
      createdAt: a.datetime().required().default('now'),
      updatedAt: a.datetime().required().default('now')
    })
    .authorization(({ allow }) => {
      // Anyone can create messages
      allow.guest().to(['create']);
      
      // Only authenticated users can read/update messages
      allow.authenticated().to(['read', 'update']);
    })
});
```

### 4.2 GraphQL API

The system will automatically generate the following GraphQL operations:

**Mutations:**
- `createMessage`: Create a new message entry
- `updateMessage`: Update an existing message (for status changes)
- `deleteMessage`: Delete a message

**Queries:**
- `getMessage`: Retrieve a specific message by ID
- `listMessages`: List all messages with optional filtering
- `messagesByStatus`: List messages filtered by status

## 5. Security Model

### 5.1 Authentication

- **Admin Authentication**: Uses Amazon Cognito for secure admin login
- **Initial Setup**: Single admin account (fitness coach)
- **Authentication Flow**: Email/password-based authentication

### 5.2 Authorization

The authorization rules for the Message model are:
- **Anonymous/Guest Access**: Can only create new messages (submit the form)
- **Authenticated Access**: Can read and update messages (admin only)
- **No Public Read Access**: Messages are private and only accessible to authenticated users

### 5.3 API Security

- **API Key**: Used for guest access to create messages
- **Cognito User Pool**: Used for admin authentication
- **HTTPS**: All API communications encrypted in transit

## 6. User Interface Design

### 6.1 Contact Form (Existing)

The existing contact form in connect.html will be enhanced with:
- Form validation before submission
- API integration for message submission
- Improved success/error messaging

### 6.2 Admin Dashboard (New)

A new admin.html page will be created with:
- Login form with email/password authentication
- Message list display with sorting and filtering options
- Message detail view
- Status update capability (mark as read/replied)
- Logout functionality

## 7. API Integration

### 7.1 Frontend to API Integration

The contact form will be integrated with AWS Amplify using:

```javascript
// Simplified example of form submission code
import { generateClient } from 'aws-amplify/api';
import { createMessage } from './graphql/mutations';

const client = generateClient();

async function submitMessage(formData) {
  try {
    const result = await client.graphql({
      query: createMessage,
      variables: {
        input: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          service: formData.service,
          message: formData.message,
          newsletter: formData.newsletter
        }
      }
    });
    return { success: true, data: result.data.createMessage };
  } catch (error) {
    console.error('Error submitting message:', error);
    return { success: false, error: error.message };
  }
}
```

### 7.2 Admin Dashboard API Integration

The admin dashboard will use:

```javascript
// Simplified example of message retrieval code
import { generateClient } from 'aws-amplify/api';
import { listMessages } from './graphql/queries';
import { updateMessage } from './graphql/mutations';

const client = generateClient();

async function getMessages(filter = {}) {
  try {
    const result = await client.graphql({
      query: listMessages,
      variables: { filter }
    });
    return result.data.listMessages.items;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

async function updateMessageStatus(id, status) {
  try {
    const result = await client.graphql({
      query: updateMessage,
      variables: {
        input: {
          id,
          status,
          updatedAt: new Date().toISOString()
        }
      }
    });
    return result.data.updateMessage;
  } catch (error) {
    console.error('Error updating message status:', error);
    throw error;
  }
}
```

## 8. Implementation Plan

### 8.1 Project Setup

1. Install dependencies:
```bash
npm init -y
npm install aws-amplify @aws-amplify/backend
```

2. Initialize Amplify backend:
```bash
npx ampx init
```

3. Create directory structure:
```
- amplify/
  - auth/
    - resource.ts
  - data/
    - resource.ts
    - schema.ts
  - backend.ts
- src/
  - admin.html
  - connect.html (existing)
  - scripts/
    - amplify-config.js
    - message-form.js
    - admin-dashboard.js
```

### 8.2 Backend Implementation

1. Define authentication resource in `amplify/auth/resource.ts`
2. Define data model in `amplify/data/schema.ts`
3. Configure data resource in `amplify/data/resource.ts`
4. Integrate resources in `amplify/backend.ts`
5. Deploy backend:
```bash
npx ampx dev  # For local testing
npx ampx deploy  # For production deployment
```

### 8.3 Frontend Implementation

1. Create `scripts/amplify-config.js` to initialize Amplify
2. Enhance contact form in `connect.html`:
   - Add form validation
   - Integrate with Amplify API
   - Improve success/error messaging
3. Create admin dashboard in `admin.html`:
   - Implement login functionality
   - Create message listing component
   - Add status update capabilities
   - Implement logout functionality

## 9. Testing Strategy

### 9.1 Unit Testing

- Test form validation logic
- Test API integration functions
- Test authentication flows

### 9.2 Integration Testing

- Test end-to-end message submission flow
- Test admin dashboard login and message retrieval
- Test message status updates

### 9.3 Security Testing

- Verify proper authentication enforcement
- Test authorization rules for different user types
- Verify HTTPS enforcement

## 10. Deployment Strategy

1. **Local Development**:
   - Use `npx ampx dev` for local backend testing
   - Test frontend changes against local backend

2. **Production Deployment**:
   - Deploy backend using `npx ampx deploy`
   - Upload frontend files to hosting service
   - Verify end-to-end functionality in production

## 11. Future Extensions

The architecture is designed to easily accommodate future features:

### 11.1 Client Accounts

- Extend the authentication system to support client registrations
- Add user profiles and role-based access control
- Create client-specific dashboards

### 11.2 Appointment Scheduling

- Add appointment data model
- Implement calendar integration
- Create appointment creation and management interfaces

### 11.3 Progress Tracking

- Add measurement data models
- Implement visualization components
- Create progress tracking interfaces

## 12. Maintenance Considerations

### 12.1 Monitoring

- Set up CloudWatch alerts for API errors
- Monitor DynamoDB capacity usage
- Implement logging for critical operations

### 12.2 Backup Strategy

- Enable point-in-time recovery for DynamoDB
- Schedule regular database backups
- Document restore procedures

### 12.3 Performance Optimization

- Configure appropriate DynamoDB capacity units
- Implement pagination for message listings
- Use efficient GraphQL queries to minimize data transfer

## 13. Technical Debt Considerations

- Plan for eventual migration of existing HTML files to a modern framework (React, Vue, etc.) to better leverage Amplify's capabilities
- Consider implementing a more sophisticated state management solution as the application grows
- Plan for internationalization support in the future

## 14. Conclusion

This design outlines a scalable, secure architecture for implementing the message submission feature for SHREY.FIT using AWS Amplify Gen 2. The implementation follows cloud best practices and provides a solid foundation for future enhancements to the fitness platform.
