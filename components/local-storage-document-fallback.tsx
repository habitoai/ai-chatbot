'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLocalStorageContext } from './local-storage-context';
import { toast } from 'sonner';
import { getDocumentsById } from '@/lib/db/client/documents';
import { DocumentContent } from './document-content';

interface LocalStorageDocumentFallbackProps {
  documentId: string;
}

/**
 * Component that checks local storage for a document when it's not found in the server database
 */
export function LocalStorageDocumentFallback({ documentId }: LocalStorageDocumentFallbackProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [localDocument, setLocalDocument] = useState<any>(null);
  const { isInitialized, isOnline } = useLocalStorageContext();
  const router = useRouter();

  useEffect(() => {
    // Only try to fetch from local storage once it's initialized
    if (!isInitialized) {
      return;
    }

    async function fetchLocalDocument() {
      try {
        // Try to get the document from local storage
        const documents = await getDocumentsById(documentId);
        
        if (documents && documents.length > 0) {
          setLocalDocument(documents[0]);
          toast.info('This document was found in local storage but not on the server. Changes will be synced when online.');
        } else {
          // If not found in local storage either, redirect to home
          router.push('/');
          toast.error('Document not found in local storage or on the server.');
        }
      } catch (error) {
        console.error('Error fetching document from local storage:', error);
        router.push('/');
        toast.error('Error loading document from local storage.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLocalDocument();
  }, [documentId, router, isInitialized]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            'h-6 w-6 animate-spin rounded-full border-2',
            'border-primary border-t-transparent'
          )} />
          <p className="text-sm text-muted-foreground">
            Looking for document in local storage...
          </p>
        </div>
      </div>
    );
  }

  if (!localDocument) {
    return null; // Will be redirected by the useEffect
  }

  // Create a document object from the local document for the DocumentContent component
  const document = {
    id: documentId,
    title: localDocument.title,
    kind: localDocument.kind,
    content: localDocument.content,
    userId: localDocument.userId,
    createdAt: localDocument.createdAt
  } as any; // Type assertion to match Document type expected by DocumentContent

  return (
    <div className="flex flex-col w-full h-full">
      <div className="sticky top-0 z-10 flex items-center justify-center h-10 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm">
        This document is currently only available offline. Changes will be synced when you're back online.
      </div>
      <div className="flex-1 p-4">
        <DocumentContent document={document} />
      </div>
    </div>
  );
}
