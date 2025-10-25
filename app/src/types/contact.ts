import { Timestamp } from 'firebase/firestore';

export type ContactStatus = 'Unread' | 'Read' | 'Replied';

export interface ContactSubmission {
  id: string;
  Name: string;
  Email: string;
  EmailLower: string;
  Phone: string | null;
  Service: string;
  ServiceDisplayText: string;
  Message: string;
  Newsletter: boolean;
  Status: ContactStatus;
  Sent: Timestamp;
  LastUpdated: Timestamp;
  Replied: boolean;
  Archived: boolean;
}

export interface Reply {
  id: string;
  content: string;
  sentBy: string;
  sentAt: Timestamp;
  createdAt: Timestamp;
}

export interface ContactSubmissionWithReplies extends ContactSubmission {
  replies?: Reply[];
}
