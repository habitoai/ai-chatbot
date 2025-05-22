/**
 * Utility functions for handling file uploads with Vercel Blob
 * Includes support for offline queuing and synchronization
 */
import { generateUUID } from './utils';
import { db, isInitialized } from './db/client/database';
import type { StoredFile } from './db/client/database';

// Interface for file upload queue item
export interface QueuedFileUpload {
  id: string;
  file: File;
  createdAt: Date;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

// Interface for attachment metadata
export interface AttachmentMetadata {
  id: string;
  name: string;
  url: string;
  contentType: string;
  size: number;
  createdAt: Date;
  uploadedAt?: Date;
}

// Local storage keys
const UPLOAD_QUEUE_KEY = 'nexuschat_upload_queue';
const ATTACHMENT_METADATA_KEY = 'nexuschat_attachments';

/**
 * Add a file to the upload queue
 * @param file File to upload
 * @returns QueuedFileUpload object
 */
export function queueFileUpload(file: File): QueuedFileUpload {
  // Create a new queue entry
  const queueEntry: QueuedFileUpload = {
    id: generateUUID(),
    file,
    createdAt: new Date(),
    status: 'pending',
  };

  // Get existing queue from local storage
  const existingQueueString = localStorage.getItem(UPLOAD_QUEUE_KEY);
  const existingQueue: QueuedFileUpload[] = existingQueueString 
    ? JSON.parse(existingQueueString) 
    : [];

  // Add new entry to queue
  const updatedQueue = [...existingQueue, queueEntry];
  
  // Store file metadata in localStorage
  localStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(updatedQueue.map(entry => ({
    ...entry,
    file: {
      name: entry.file.name,
      type: entry.file.type,
      size: entry.file.size,
    }
  }))));

  // Store actual file data in IndexedDB
  saveFileToDB(queueEntry.id, file);

  return queueEntry;
}

/**
 * Helper function to save file to IndexedDB
 * @param id Unique ID for the file
 * @param file The File object to save
 */
async function saveFileToDB(id: string, file: File): Promise<void> {
  try {
    // Wait for database initialization
    if (!isInitialized()) {
      console.warn('Database not initialized yet, waiting...');
      // Wait for up to 5 seconds for the database to initialize
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (isInitialized()) break;
      }
      
      if (!isInitialized()) {
        throw new Error('Database initialization timeout');
      }
    }
    
    // Check if database is initialized
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Save the file to IndexedDB
    await db.table('files').put({
      id,
      data: file,
      name: file.name,
      type: file.type,
      size: file.size,
      createdAt: new Date()
    });
    
    console.log(`File ${file.name} saved to IndexedDB with ID ${id}`);
  } catch (error) {
    console.error('Error saving file to IndexedDB:', error);
  }
}

/**
 * Upload a file to Vercel Blob
 * @param file File to upload
 * @returns Promise resolving to the uploaded file URL and metadata
 */
export async function uploadFileToBlobStorage(file: File, maxRetries = 3): Promise<{
  url: string;
  pathname: string;
  contentType: string;
}> {
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      return await response.json();
    } catch (error) {
      retries++;
      
      // If we've exhausted all retries, throw the error
      if (retries > maxRetries) {
        throw error;
      }
      
      // Wait with exponential backoff before retrying
      const delay = Math.min(1000 * Math.pow(2, retries), 10000);
      console.log(`Upload failed, retrying in ${delay}ms (attempt ${retries} of ${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the throw in the catch block,
  // but TypeScript needs a return statement
  throw new Error('Failed to upload file after multiple retries');
}

/**
 * Process the upload queue
 * @returns Promise resolving to an array of processed uploads
 */
export async function processUploadQueue(): Promise<QueuedFileUpload[]> {
  // Get existing queue from local storage
  const existingQueueString = localStorage.getItem(UPLOAD_QUEUE_KEY);
  if (!existingQueueString) {
    return [];
  }

  const queueData = JSON.parse(existingQueueString);
  
  const pendingUploads = queueData.filter((item: any) => item.status === 'pending');
  
  if (pendingUploads.length === 0) {
    return [];
  }
  
  // Process each pending upload
  const processedUploads: QueuedFileUpload[] = [];
  
  // Process each pending upload
  for (const upload of pendingUploads) {
    try {
      // Update status to uploading
      updateUploadStatus(upload.id, 'uploading');
      
      // Retrieve the file from IndexedDB
      const file = await getFileFromDB(upload.id);
      if (!file) {
        throw new Error('File not found in IndexedDB');
      }
      
      // Upload the file
      const result = await uploadFileToBlobStorage(file);
      
      // Update status to success
      updateUploadStatus(upload.id, 'success', result.url);
      
      // Save attachment metadata
      const attachment: AttachmentMetadata = {
        id: upload.id,
        name: file.name,
        url: result.url,
        contentType: file.type,
        size: file.size,
        createdAt: upload.createdAt,
        uploadedAt: new Date()
      };
      saveAttachmentMetadata(attachment);
      
      processedUploads.push({
        ...upload,
        status: 'success',
        url: result.url,
        file
      });
    } catch (error) {
      // Update status to error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateUploadStatus(upload.id, 'error', undefined, errorMessage);
      console.error(`Error processing upload ${upload.id}:`, error);
    }
  }
  
  return processedUploads;
}

/**
 * Helper function to get file from IndexedDB
 * @param id ID of the file to retrieve
 * @returns Promise resolving to the File object or null if not found
 */
async function getFileFromDB(id: string): Promise<File | null> {
  try {
    if (!isInitialized()) {
      console.warn('Database not initialized yet, waiting...');
      // Wait for up to 5 seconds for the database to initialize
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (isInitialized()) break;
      }
      
      if (!isInitialized()) {
        throw new Error('Database initialization timeout');
      }
    }
    
    // Check if database is initialized
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const fileData = await db.table('files').get(id);
    return fileData ? fileData.data : null;
  } catch (error) {
    console.error('Error retrieving file from IndexedDB:', error);
    return null;
  }
}

/**
 * Helper function to update upload status in localStorage
 * @param id ID of the upload to update
 * @param status New status for the upload
 * @param url Optional URL for successful uploads
 * @param error Optional error message for failed uploads
 */
function updateUploadStatus(
  id: string, 
  status: 'pending' | 'uploading' | 'success' | 'error',
  url?: string,
  error?: string
): void {
  const queueString = localStorage.getItem(UPLOAD_QUEUE_KEY);
  if (!queueString) return;
  
  const queue = JSON.parse(queueString);
  const updatedQueue = queue.map((item: any) => 
    item.id === id ? { ...item, status, url, error } : item
  );
  
  localStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(updatedQueue));
}

/**
 * Save attachment metadata to local storage
 * @param attachment Attachment metadata to save
 */
export function saveAttachmentMetadata(attachment: AttachmentMetadata): void {
  // Get existing metadata from local storage
  const existingMetadataString = localStorage.getItem(ATTACHMENT_METADATA_KEY);
  const existingMetadata: AttachmentMetadata[] = existingMetadataString 
    ? JSON.parse(existingMetadataString) 
    : [];

  // Add new metadata
  const updatedMetadata = [...existingMetadata, attachment];
  
  // Save updated metadata to local storage
  localStorage.setItem(ATTACHMENT_METADATA_KEY, JSON.stringify(updatedMetadata));
}

/**
 * Get all attachment metadata from local storage
 * @returns Array of attachment metadata
 */
export function getAttachmentMetadata(): AttachmentMetadata[] {
  const metadataString = localStorage.getItem(ATTACHMENT_METADATA_KEY);
  return metadataString ? JSON.parse(metadataString) : [];
}

/**
 * Check if a file is already in the upload queue
 * @param fileName Name of the file to check
 * @returns Boolean indicating if the file is in the queue
 */
export function isFileInUploadQueue(fileName: string): boolean {
  const queueString = localStorage.getItem(UPLOAD_QUEUE_KEY);
  if (!queueString) {
    return false;
  }
  
  const queue = JSON.parse(queueString);
  return queue.some((item: any) => item.file.name === fileName);
}

/**
 * Clear the upload queue
 */
export function clearUploadQueue(): void {
  localStorage.removeItem(UPLOAD_QUEUE_KEY);
}
