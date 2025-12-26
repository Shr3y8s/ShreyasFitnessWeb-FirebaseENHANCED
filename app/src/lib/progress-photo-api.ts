import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, getDoc, collection, query, where, getDocs, Timestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import exifr from 'exifr';
import type { 
  ProgressPhotoDocument, 
  PhotoAngle, 
  UploadPhotoParams,
  ProgressPhotoWithId,
  PhotoData
} from '@/types/progress-photo';

/**
 * Extract date from photo EXIF data
 * Returns date in YYYY-MM-DD format or null if not found
 */
export async function extractPhotoDate(file: File): Promise<string | null> {
  try {
    console.log('📸 Extracting EXIF from:', file.name);
    
    const exif = await exifr.parse(file);
    console.log('📋 Full EXIF data:', exif);
    
    if (exif?.DateTimeOriginal) {
      console.log('📅 DateTimeOriginal found:', exif.DateTimeOriginal);
      const date = new Date(exif.DateTimeOriginal);
      const dateString = date.toISOString().split('T')[0];
      console.log('✅ Extracted date:', dateString);
      return dateString;
    } else {
      console.log('❌ No DateTimeOriginal in EXIF data');
    }
  } catch (error) {
    console.log('⚠️ EXIF extraction failed (this is normal for photos without metadata):', error);
  }
  return null;
}

/**
 * Compress image to create thumbnail
 * Returns a Blob of the compressed image
 */
async function compressImage(
  file: File, 
  maxWidth: number, 
  maxHeight: number,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload a progress photo to Firebase Storage and save metadata to Firestore
 */
export async function uploadProgressPhoto({
  userId,
  date,
  angle,
  file,
  associatedMetrics
}: UploadPhotoParams): Promise<{ success: boolean; error?: string; photoData?: PhotoData }> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' };
    }
    
    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 5MB' };
    }
    
    const storage = getStorage();
    
    // Upload original image
    const originalRef = ref(storage, `progressPhotos/${userId}/${date}/${angle}_original.jpg`);
    await uploadBytes(originalRef, file);
    const originalUrl = await getDownloadURL(originalRef);
    
    // Create and upload thumbnail
    const thumbnailBlob = await compressImage(file, 400, 400, 0.8);
    const thumbnailRef = ref(storage, `progressPhotos/${userId}/${date}/${angle}_thumbnail.jpg`);
    await uploadBytes(thumbnailRef, thumbnailBlob);
    const thumbnailUrl = await getDownloadURL(thumbnailRef);
    
    const photoData: PhotoData = {
      url: originalUrl,
      thumbnailUrl,
      storageRef: originalRef.fullPath,
      uploadedAt: Timestamp.now()
    };
    
    // Save or update metadata in Firestore
    const docId = `${userId}_${date}`;
    const photoDoc = doc(db, 'progressPhotos', docId);
    
    // Check if document exists
    const existingDoc = await getDoc(photoDoc);
    
    if (existingDoc.exists()) {
      // Update existing document with new angle
      await setDoc(photoDoc, {
        photos: {
          ...existingDoc.data().photos,
          [angle]: photoData
        },
        updatedAt: Timestamp.now()
      }, { merge: true });
    } else {
      // Create new document
      const newDoc: ProgressPhotoDocument = {
        userId,
        date,
        photos: {
          [angle]: photoData
        },
        // Only include associatedMetrics if it's defined (not undefined)
        ...(associatedMetrics && { associatedMetrics }),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      await setDoc(photoDoc, newDoc);
    }
    
    return { success: true, photoData };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { success: false, error: error.message || 'Failed to upload photo' };
  }
}

/**
 * Get all progress photos for a user
 */
export async function getUserProgressPhotos(userId: string): Promise<ProgressPhotoWithId[]> {
  try {
    const photosQuery = query(
      collection(db, 'progressPhotos'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(photosQuery);
    const photos: ProgressPhotoWithId[] = [];
    
    snapshot.forEach((doc) => {
      photos.push({
        id: doc.id,
        ...doc.data()
      } as ProgressPhotoWithId);
    });
    
    return photos;
  } catch (error: any) {
    // Handle permissions errors gracefully (e.g., empty collection)
    if (error?.code === 'permission-denied') {
      console.log('No progress photos found or insufficient permissions');
      return [];
    }
    console.error('Error fetching progress photos:', error);
    return [];
  }
}

/**
 * Get progress photo for a specific date
 */
export async function getProgressPhotoForDate(
  userId: string, 
  date: string
): Promise<ProgressPhotoWithId | null> {
  try {
    const docId = `${userId}_${date}`;
    const photoDoc = doc(db, 'progressPhotos', docId);
    const snapshot = await getDoc(photoDoc);
    
    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data()
      } as ProgressPhotoWithId;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching progress photo:', error);
    return null;
  }
}

/**
 * Delete a specific angle photo from a progress photo document
 */
export async function deleteProgressPhotoAngle(
  userId: string,
  date: string,
  angle: PhotoAngle
): Promise<{ success: boolean; error?: string }> {
  try {
    const docId = `${userId}_${date}`;
    const photoDoc = doc(db, 'progressPhotos', docId);
    const snapshot = await getDoc(photoDoc);
    
    if (!snapshot.exists()) {
      return { success: false, error: 'Photo not found' };
    }
    
    const data = snapshot.data() as ProgressPhotoDocument;
    const photoData = data.photos[angle];
    
    if (!photoData) {
      return { success: false, error: 'Angle not found' };
    }
    
    // Delete from Storage
    const storage = getStorage();
    try {
      await deleteObject(ref(storage, photoData.storageRef));
      await deleteObject(ref(storage, photoData.storageRef.replace('_original.jpg', '_thumbnail.jpg')));
    } catch (storageError) {
      console.error('Storage deletion error:', storageError);
    }
    
    // Update Firestore - remove the angle
    const updatedPhotos = { ...data.photos };
    delete updatedPhotos[angle];
    
    // If no photos left, delete the entire document
    if (Object.keys(updatedPhotos).length === 0) {
      await deleteDoc(photoDoc);
    } else {
      await setDoc(photoDoc, {
        photos: updatedPhotos,
        updatedAt: Timestamp.now()
      }, { merge: true });
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Delete error:', error);
    return { success: false, error: error.message || 'Failed to delete photo' };
  }
}

/**
 * Update notes for a progress photo
 */
export async function updateProgressPhotoNotes(
  userId: string,
  date: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docId = `${userId}_${date}`;
    const photoDoc = doc(db, 'progressPhotos', docId);
    
    await setDoc(photoDoc, {
      notes: notes.trim() || null,
      updatedAt: Timestamp.now()
    }, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    console.error('Update notes error:', error);
    return { success: false, error: error.message || 'Failed to update notes' };
  }
}

/**
 * Get progress photos within a date range (for chart integration)
 */
export async function getProgressPhotosInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ProgressPhotoWithId[]> {
  try {
    const photosQuery = query(
      collection(db, 'progressPhotos'),
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );
    
    const snapshot = await getDocs(photosQuery);
    const photos: ProgressPhotoWithId[] = [];
    
    snapshot.forEach((doc) => {
      photos.push({
        id: doc.id,
        ...doc.data()
      } as ProgressPhotoWithId);
    });
    
    return photos;
  } catch (error) {
    console.error('Error fetching progress photos in range:', error);
    return [];
  }
}
