'use client';

import { LocalStorageProvider } from './local-storage-context';
import { DocumentLocalStorageProvider } from './document-local-storage-provider';
import { OfflineAttachmentHandler } from './offline-attachment-handler';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocalStorageProvider>
      <DocumentLocalStorageProvider />
      <OfflineAttachmentHandler>
        {children}
      </OfflineAttachmentHandler>
    </LocalStorageProvider>
  );
}
