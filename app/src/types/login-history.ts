import { Timestamp } from 'firebase/firestore';

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  timestamp: Timestamp;
  success: boolean;
  
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
    userAgent?: string;
  };
  
  location: {
    ip: string;        // Anonymized
    city: string;
    state: string;
    country: string;
    countryCode: string;
  };
  
  // For failed logins
  failureReason?: 'wrong-password' | 'user-not-found' | 'too-many-requests' | 'account-disabled' | 'network-error';
  attemptNumber?: number;
  
  createdAt: Timestamp;
}

export interface LoginHistoryStats {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueLocations: number;
  mostUsedDevice: string;
  lastLogin?: Date;
}
