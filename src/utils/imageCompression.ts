import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file before uploading to save bandwidth and improve speed.
 * @param file The original image File object
 * @returns A Promise that resolves to the compressed File object
 */
export const compressImage = async (file: File): Promise<File> => {
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  const options = {
    maxSizeMB: 0.5,           // Target 500KB maximum size
    maxWidthOrHeight: 1200,   // Max width/height to resize down to
    useWebWorker: true,
    initialQuality: 0.8,
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    // Convert Blob back to File
    return new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file as fallback
    return file;
  }
};
