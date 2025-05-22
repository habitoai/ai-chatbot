'use client';

import { useEffect } from 'react';
import { useLocalStorageContext } from './local-storage-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Document } from '@/lib/db/schema';
import type { ArtifactKind } from './artifact';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

/**
 * Component that automatically saves documents to local storage
 * when they're created or modified
 */
export function DocumentLocalStorageProvider() {
  const { data: session } = useSession();
  const { isInitialized, isOnline, saveDocument } = useLocalStorageContext();
  const queryClient = useQueryClient();

  // Listen for document cache updates and save them to local storage
  useEffect(() => {
    if (!isInitialized || !session?.user?.id) {
      return;
    }

    // Function to handle document cache changes
    const handleDocumentCacheChange = (document: Document) => {
      if (!document || !document.id) return;

      // Save the document to local storage
      saveDocument({
        id: document.id,
        title: document.title || 'Untitled Document',
        kind: document.kind as ArtifactKind,
        content: document.content || '',
        userId: session.user.id,
        createdAt: document.createdAt ? new Date(document.createdAt) : new Date(),
      }).catch(error => {
        console.error('Error saving document to local storage:', error);
      });
    };

    // Subscribe to query cache changes
    const unsubscribe = queryClient.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && event.query.queryKey[0] === 'document') {
        const documentId = event.query.queryKey[1];
        if (documentId && typeof documentId === 'string') {
          const documents = queryClient.getQueryData<Document[]>(['document', documentId]);
          if (documents && documents.length > 0) {
            handleDocumentCacheChange(documents[0]);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isInitialized, session?.user?.id, saveDocument, queryClient, isOnline]);

  // This component doesn't render anything
  return null;
}
