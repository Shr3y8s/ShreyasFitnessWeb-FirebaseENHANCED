import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  getDoc,
  Timestamp,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import type { ContactSubmission, ContactSubmissionWithReplies, Reply, ContactStatus } from '@/types/contact';

const SUBMISSIONS_COLLECTION = 'contact_form_submissions';

/**
 * Fetch all contact form submissions with optional filtering
 */
export async function fetchContactSubmissions(
  statusFilter?: ContactStatus | 'ALL',
  serviceFilter?: string | 'ALL'
): Promise<ContactSubmission[]> {
  try {
    const constraints: QueryConstraint[] = [];

    // Status filter
    if (statusFilter && statusFilter !== 'ALL') {
      constraints.push(where('Status', '==', statusFilter));
    }

    // Service filter
    if (serviceFilter && serviceFilter !== 'ALL') {
      constraints.push(where('Service', '==', serviceFilter));
    }

    // Always order by newest first
    constraints.push(orderBy('Sent', 'desc'));

    const q = query(collection(db, SUBMISSIONS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const submissions: ContactSubmission[] = [];
    querySnapshot.forEach((doc) => {
      submissions.push({
        id: doc.id,
        ...doc.data()
      } as ContactSubmission);
    });

    return submissions;
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates for contact submissions
 */
export function subscribeToContactSubmissions(
  callback: (submissions: ContactSubmission[]) => void,
  statusFilter?: ContactStatus | 'ALL',
  serviceFilter?: string | 'ALL'
) {
  try {
    const constraints: QueryConstraint[] = [];

    if (statusFilter && statusFilter !== 'ALL') {
      constraints.push(where('Status', '==', statusFilter));
    }

    if (serviceFilter && serviceFilter !== 'ALL') {
      constraints.push(where('Service', '==', serviceFilter));
    }

    constraints.push(orderBy('Sent', 'desc'));

    const q = query(collection(db, SUBMISSIONS_COLLECTION), ...constraints);

    return onSnapshot(q, (querySnapshot) => {
      const submissions: ContactSubmission[] = [];
      querySnapshot.forEach((doc) => {
        submissions.push({
          id: doc.id,
          ...doc.data()
        } as ContactSubmission);
      });
      callback(submissions);
    });
  } catch (error) {
    console.error('Error subscribing to contact submissions:', error);
    throw error;
  }
}

/**
 * Get a single contact submission by ID with replies
 */
export async function getContactSubmission(
  submissionId: string
): Promise<ContactSubmissionWithReplies | null> {
  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const submission = {
      id: docSnap.id,
      ...docSnap.data()
    } as ContactSubmission;

    // Fetch replies
    const repliesRef = collection(db, SUBMISSIONS_COLLECTION, submissionId, 'replies');
    const repliesQuery = query(repliesRef, orderBy('createdAt', 'asc'));
    const repliesSnapshot = await getDocs(repliesQuery);

    const replies: Reply[] = [];
    repliesSnapshot.forEach((doc) => {
      replies.push({
        id: doc.id,
        ...doc.data()
      } as Reply);
    });

    return {
      ...submission,
      replies
    };
  } catch (error) {
    console.error('Error fetching contact submission:', error);
    throw error;
  }
}

/**
 * Update contact submission status with validation
 * Rules:
 * - NEW/Unread → Read ✅
 * - NEW/Unread → Replied ✅
 * - Read → Unread ✅
 * - Read → Replied ✅
 * - Replied → Read ❌ (terminal state)
 * - Replied → Unread ❌ (terminal state)
 */
export async function updateContactStatus(
  submissionId: string,
  status: ContactStatus
): Promise<void> {
  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    
    // Get current status for validation
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Message not found');
    }
    
    const currentStatus = docSnap.data().Status as ContactStatus;
    
    // Validation: REPLIED is a terminal state - cannot go back
    if (currentStatus === 'Replied' && (status === 'Read' || status === 'Unread')) {
      throw new Error('Messages that have been replied to cannot be marked as unread or read.');
    }
    
    // Update with validation passed
    await updateDoc(docRef, {
      Status: status,
      LastUpdated: Timestamp.now(),
      Replied: status === 'Replied' ? true : false
    });
  } catch (error) {
    console.error('Error updating contact status:', error);
    throw error;
  }
}

/**
 * Archive a contact submission
 */
export async function archiveContactSubmission(
  submissionId: string,
  archived: boolean = true
): Promise<void> {
  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    await updateDoc(docRef, {
      Archived: archived,
      LastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error('Error archiving contact submission:', error);
    throw error;
  }
}

/**
 * Delete a contact submission
 */
export async function deleteContactSubmission(submissionId: string): Promise<void> {
  try {
    // Delete all replies first
    const repliesRef = collection(db, SUBMISSIONS_COLLECTION, submissionId, 'replies');
    const repliesSnapshot = await getDocs(repliesRef);
    
    const deletePromises = repliesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Delete the submission
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting contact submission:', error);
    throw error;
  }
}

/**
 * Create a reply to a contact submission
 */
export async function createReply(
  submissionId: string,
  content: string,
  sentBy: string
): Promise<Reply> {
  try {
    const repliesRef = collection(db, SUBMISSIONS_COLLECTION, submissionId, 'replies');
    
    const replyData = {
      content,
      sentBy,
      sentAt: Timestamp.now(),
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(repliesRef, replyData);

    // Update the parent submission status
    await updateContactStatus(submissionId, 'Replied');

    return {
      id: docRef.id,
      ...replyData
    };
  } catch (error) {
    console.error('Error creating reply:', error);
    throw error;
  }
}

/**
 * Get unique service types from submissions
 */
export async function getServiceTypes(): Promise<string[]> {
  try {
    const querySnapshot = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    const services = new Set<string>();
    
    querySnapshot.forEach((doc) => {
      const service = doc.data().Service;
      if (service) {
        services.add(service);
      }
    });

    return Array.from(services).sort();
  } catch (error) {
    console.error('Error fetching service types:', error);
    return [];
  }
}
