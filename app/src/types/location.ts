import { Timestamp } from 'firebase/firestore';

/**
 * Training Location
 * Represents a physical location where in-person training sessions can occur
 */
export interface TrainingLocation {
  id: string;
  name: string;              // Short name for matching (e.g., "Ironworks")
  displayName: string;       // Display name (e.g., "Ironworks Gym")
  address: string;           // Full address shown to clients
  isDefault: boolean;        // One location must always be default
  isActive: boolean;         // false = hidden/inactive
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Create/Update Location Request
 */
export interface LocationFormData {
  name: string;
  displayName: string;
  address: string;
  isDefault?: boolean;
}

/**
 * Location with session count for UI display
 */
export interface LocationWithCount extends TrainingLocation {
  upcomingSessionCount: number;
  totalSessionCount: number;
}
