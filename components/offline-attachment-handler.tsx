'use client';

import { useEffect, useState } from 'react';
import { useLocalStorageContext } from './local-storage-context';
import type { Attachment } from 'ai';
import { toast } from 'sonner';
import { 
  getAttachmentMetadata, 
  processUploadQueue, 
  isFileInUploadQueue 
} from '@/lib/blob-storage';

interface OfflineAttachmentHandlerProps {
  children: React.ReactNode;
}

/**
 * Component that handles attachment synchronization when coming back online
 */
export function OfflineAttachmentHandler({ children }: OfflineAttachmentHandlerProps) {
  const { isInitialized, isOnline } = useLocalStorageContext();
  const [isSyncing, setIsSyncing] = useState(false);

  // Process any pending uploads when coming back online
  useEffect(() => {
    if (!isInitialized) return;

    let syncTimeout: NodeJS.Timeout;

    const handleOnline = async () => {
      // Only process if we're actually online
      if (!navigator.onLine) return;

      // Set syncing state
      setIsSyncing(true);
      toast.info('Processing pending file uploads...');

      try {
        // Process the upload queue
        const processedUploads = await processUploadQueue();
        
        if (processedUploads.length > 0) {
          toast.success(`Uploaded ${processedUploads.length} pending files`);
        }
      } catch (error) {
        console.error('Error processing upload queue:', error);
        toast.error('Failed to process some pending uploads');
      } finally {
        setIsSyncing(false);
      }
    };

    // If we're online when the component mounts, check for pending uploads
    if (isOnline) {
      // Delay the check slightly to ensure the app is fully loaded
      syncTimeout = setTimeout(() => {
        handleOnline();
      }, 2000);
    }

    // Add event listener for when we come back online
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearTimeout(syncTimeout);
    };
  }, [isInitialized, isOnline]);

  // This component doesn't render anything visible
  return <>{children}</>;
}

/**
 * Hook to get attachment information, handling both online and offline states
 * @param attachments Array of attachments from the AI SDK
 * @returns Enhanced attachments with offline status information
 */
export function useOfflineAttachments(attachments: Attachment[] = []) {
  const { isOnline } = useLocalStorageContext();
  const [enhancedAttachments, setEnhancedAttachments] = useState<(Attachment & { isOffline?: boolean })[]>([]);

  useEffect(() => {
    // Process attachments to add offline status
    const processAttachments = () => {
      const storedMetadata = getAttachmentMetadata();
      
      const processed = attachments.map(attachment => {
        // Check if this attachment is in our local metadata
        const isInLocalStorage = storedMetadata.some(meta => 
          meta.url === attachment.url || meta.name === attachment.name
        );
        
        // Check if this attachment is in the upload queue
        const isInQueue = attachment.name ? isFileInUploadQueue(attachment.name) : false;
        
        // Mark as offline if we're offline and it's either in local storage or in queue
        const isOffline = !isOnline && (isInLocalStorage || isInQueue);
        
        return {
          ...attachment,
          isOffline
        };
      });
      
      setEnhancedAttachments(processed);
    };
    
    processAttachments();
  }, [attachments, isOnline]);
  
  return enhancedAttachments;
}
