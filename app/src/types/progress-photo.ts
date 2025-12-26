import { Timestamp } from 'firebase/firestore';

export interface PhotoData {
  url: string;
  thumbnailUrl: string;
  storageRef: string;
  uploadedAt: Timestamp;
}

export interface ProgressPhotoDocument {
  userId: string;
  date: string; // YYYY-MM-DD
  
  // Photo URLs from Storage (3 angles)
  photos: {
    front?: PhotoData;
    side?: PhotoData;
    back?: PhotoData;
  };
  
  // Associated metrics at time of photo
  associatedMetrics?: {
    weight?: number;
    weightUnit?: 'lbs' | 'kg';
    bodyFat?: number;
    bmi?: number;
    measurements?: {
      waist?: number;
      chest?: number;
      arms?: number;
      thighs?: number;
      unit: 'in' | 'cm';
    };
  };
  
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PhotoAngle = 'front' | 'side' | 'back';

export interface UploadPhotoParams {
  userId: string;
  date: string;
  angle: PhotoAngle;
  file: File;
  associatedMetrics?: ProgressPhotoDocument['associatedMetrics'];
}

export interface ProgressPhotoWithId extends ProgressPhotoDocument {
  id: string; // Document ID: {userId}_{date}
}
