// API Handler for Shrey's Fitness Web
import { API, graphqlOperation } from 'aws-amplify';

// GraphQL queries and mutations
const createMessageMutation = `
  mutation CreateMessage(
    $input: CreateMessageInput!
  ) {
    createMessage(input: $input) {
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
`;

const listMessagesQuery = `
  query ListMessages(
    $filter: ModelMessageFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listMessages(filter: $filter, limit: $limit, nextToken: $nextToken) {
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
      nextToken
    }
  }
`;

const updateMessageMutation = `
  mutation UpdateMessage(
    $input: UpdateMessageInput!
  ) {
    updateMessage(input: $input) {
      id
      read
      archived
    }
  }
`;

const getUserQuery = `
  query GetUser($id: ID!) {
    getUser(id: $id) {
      id
      name
      email
      phone
      userGroup
      createdAt
    }
  }
`;

const updateUserMutation = `
  mutation UpdateUser(
    $input: UpdateUserInput!
  ) {
    updateUser(input: $input) {
      id
      name
      email
      phone
      userGroup
    }
  }
`;

// API functions
const ApiHandler = {
    // Send a new message
    async sendMessage(senderName, senderEmail, subject, content) {
        try {
            const message = {
                senderName,
                senderEmail,
                subject,
                content,
                read: false,
                archived: false,
                createdAt: new Date().toISOString()
            };
            
            const result = await API.graphql(graphqlOperation(createMessageMutation, { input: message }));
            console.log('Message sent successfully:', result.data.createMessage);
            return { success: true, message: result.data.createMessage };
        } catch (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message || 'An error occurred while sending the message' };
        }
    },

    // Get all messages (for coaches)
    async getAllMessages(limit = 100) {
        try {
            const result = await API.graphql(graphqlOperation(listMessagesQuery, { limit }));
            console.log('Messages retrieved successfully:', result.data.listMessages.items);
            return { success: true, messages: result.data.listMessages.items };
        } catch (error) {
            console.error('Error getting messages:', error);
            return { success: false, error: error.message || 'An error occurred while retrieving messages' };
        }
    },

    // Mark a message as read
    async markMessageAsRead(id) {
        try {
            const result = await API.graphql(graphqlOperation(updateMessageMutation, { 
                input: { id, read: true } 
            }));
            console.log('Message marked as read:', result.data.updateMessage);
            return { success: true, message: result.data.updateMessage };
        } catch (error) {
            console.error('Error marking message as read:', error);
            return { success: false, error: error.message || 'An error occurred while updating the message' };
        }
    },

    // Archive a message
    async archiveMessage(id) {
        try {
            const result = await API.graphql(graphqlOperation(updateMessageMutation, { 
                input: { id, archived: true } 
            }));
            console.log('Message archived:', result.data.updateMessage);
            return { success: true, message: result.data.updateMessage };
        } catch (error) {
            console.error('Error archiving message:', error);
            return { success: false, error: error.message || 'An error occurred while archiving the message' };
        }
    },

    // Get user profile
    async getUserProfile(id) {
        try {
            const result = await API.graphql(graphqlOperation(getUserQuery, { id }));
            console.log('User profile retrieved:', result.data.getUser);
            return { success: true, user: result.data.getUser };
        } catch (error) {
            console.error('Error getting user profile:', error);
            return { success: false, error: error.message || 'An error occurred while retrieving the user profile' };
        }
    },

    // Update user profile
    async updateUserProfile(id, updates) {
        try {
            const input = { id, ...updates };
            const result = await API.graphql(graphqlOperation(updateUserMutation, { input }));
            console.log('User profile updated:', result.data.updateUser);
            return { success: true, user: result.data.updateUser };
        } catch (error) {
            console.error('Error updating user profile:', error);
            return { success: false, error: error.message || 'An error occurred while updating the user profile' };
        }
    }
};

export default ApiHandler;
