'use client';

import { isAfter } from 'date-fns';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useWindowSize } from 'usehooks-ts';

import type { Document } from '@/lib/db/schema';
import { getDocumentTimestampByIndex } from '@/lib/utils';

import { LoaderIcon } from './icons';
import { Button } from './ui/button';
import { useArtifact } from '@/hooks/use-artifact';

interface VersionFooterProps {
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  documents: Array<Document> | undefined;
  currentVersionIndex: number;
}

export const VersionFooter = ({
  handleVersionChange,
  documents,
  currentVersionIndex,
}: VersionFooterProps) => {
  const { artifact } = useArtifact();

  const { width } = useWindowSize();
  const isMobile = width < 768;

  const queryClient = useQueryClient();

  const restoreVersionMutation = useMutation({
    mutationFn: async (timestampToDelete: string) => {
      const response = await fetch(
        `/api/document?id=${artifact.documentId}&timestamp=${timestampToDelete}`,
        {
          method: 'DELETE',
        },
      );
      if (!response.ok) {
        throw new Error('Failed to restore version');
      }
      return response.json(); // Or handle as needed, e.g., if it's a 204
    },
    onMutate: async (timestampToDelete: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['document', artifact.documentId] });

      // Snapshot the previous value
      const previousDocuments = queryClient.getQueryData<Array<Document>>(['document', artifact.documentId]);

      // Optimistically update to the new value
      if (previousDocuments) {
        const optimisticDocuments = previousDocuments.filter((doc) =>
          isAfter(new Date(doc.createdAt), new Date(timestampToDelete)),
        );
        queryClient.setQueryData(['document', artifact.documentId], optimisticDocuments);
      }
      
      // Return a context object with the snapshotted value
      return { previousDocuments };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousDocuments) {
        queryClient.setQueryData(['document', artifact.documentId], context.previousDocuments);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['document', artifact.documentId] });
    },
  });

  if (!documents) return;

  return (
    <motion.div
      className="absolute flex flex-col gap-4 lg:flex-row bottom-0 bg-background p-4 w-full border-t z-50 justify-between"
      initial={{ y: isMobile ? 200 : 77 }}
      animate={{ y: 0 }}
      exit={{ y: isMobile ? 200 : 77 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
    >
      <div>
        <div>You are viewing a previous version</div>
        <div className="text-muted-foreground text-sm">
          Restore this version to make edits
        </div>
      </div>

      <div className="flex flex-row gap-4">
        <Button
          disabled={restoreVersionMutation.isPending}
          onClick={async () => {
            const timestamp = getDocumentTimestampByIndex(
              documents,
              currentVersionIndex,
            );
            if (timestamp) {
              restoreVersionMutation.mutate(timestamp.toISOString());
            }
          }}
        >
          <div>Restore this version</div>
          {restoreVersionMutation.isPending && (
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            handleVersionChange('latest');
          }}
        >
          Back to latest version
        </Button>
      </div>
    </motion.div>
  );
};
