import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * Create an image element from a URL
 */
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * Get cropped image from canvas
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to match the crop
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}

/**
 * Resize an image blob to specified dimensions
 */
export async function resizeImage(
  blob: Blob,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  const img = await createImage(URL.createObjectURL(blob));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Calculate new dimensions maintaining aspect ratio
  let width = img.width;
  let height = img.height;

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

  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}

/**
 * Upload image to Firebase Storage
 */
export async function uploadProfilePhoto(
  userId: string,
  imageBlob: Blob,
  size: 'small' | 'large'
): Promise<string> {
  const filename = size === 'small' ? 'avatar-small.jpg' : 'avatar-large.jpg';
  const storageRef = ref(storage, `profile-photos/${userId}/${filename}`);

  // Upload the image
  await uploadBytes(storageRef, imageBlob, {
    contentType: 'image/jpeg',
    cacheControl: 'public,max-age=31536000', // Cache for 1 year
  });

  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * Process and upload profile photo (both sizes)
 */
export async function processAndUploadProfilePhoto(
  userId: string,
  imageSrc: string,
  croppedAreaPixels: Area
): Promise<{ small: string; large: string }> {
  try {
    // Get cropped image
    const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

    // Create small version (100x100)
    const smallBlob = await resizeImage(croppedBlob, 100, 100);
    const smallURL = await uploadProfilePhoto(userId, smallBlob, 'small');

    // Create large version (400x400)
    const largeBlob = await resizeImage(croppedBlob, 400, 400);
    const largeURL = await uploadProfilePhoto(userId, largeBlob, 'large');

    return {
      small: smallURL,
      large: largeURL,
    };
  } catch (error) {
    console.error('Error processing and uploading photo:', error);
    throw error;
  }
}
