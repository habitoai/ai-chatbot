'use client';

import { TestOfflineDocument } from '@/components/test-offline-document';
import { TestFileUpload } from '@/components/test-file-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SyncStatus } from '@/components/sync-status';
import { useLocalStorageContext } from '@/components/local-storage-context';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function TestOfflinePage() {
  const { isOnline } = useLocalStorageContext();
  const [simulatedOffline, setSimulatedOffline] = useState(false);

  // Simulate going offline by overriding the navigator.onLine property
  const simulateOffline = () => {
    // Store the original descriptor
    const originalDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
    
    // Override the onLine property
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: function() { return false; }
    });
    
    // Dispatch an offline event
    window.dispatchEvent(new Event('offline'));
    
    setSimulatedOffline(true);
    
    // Restore after 5 minutes (safety measure)
    setTimeout(() => {
      if (originalDescriptor) {
        Object.defineProperty(navigator, 'onLine', originalDescriptor);
      } else {
        // Use a safer approach to reset the property
        Object.defineProperty(navigator, 'onLine', {
          configurable: true,
          get: function() { return window.navigator.onLine; }
        });
      }
      window.dispatchEvent(new Event('online'));
      setSimulatedOffline(false);
    }, 5 * 60 * 1000);
  };
  
  // Restore online status
  const restoreOnline = () => {
    // Restore the original behavior using a safer approach
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: function() { return window.navigator.onLine; }
    });
    
    // Dispatch an online event
    window.dispatchEvent(new Event('online'));
    
    setSimulatedOffline(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Offline Support Testing</h1>
      
      <div className="flex items-center justify-between mb-6 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium">
            Network Status: {isOnline ? (
              <span className="text-green-500">Online</span>
            ) : (
              <span className="text-red-500">Offline</span>
            )}
          </div>
          <SyncStatus />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={simulateOffline} 
            disabled={simulatedOffline || !isOnline}
          >
            Simulate Offline
          </Button>
          <Button 
            variant="outline" 
            onClick={restoreOnline} 
            disabled={!simulatedOffline}
          >
            Restore Online
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="documents">
        <TabsList className="mb-4">
          <TabsTrigger value="documents">Document Tests</TabsTrigger>
          <TabsTrigger value="files">File Upload Tests</TabsTrigger>
          <TabsTrigger value="info">Information</TabsTrigger>
        </TabsList>
        
        <TabsContent value="documents">
          <TestOfflineDocument />
        </TabsContent>
        
        <TabsContent value="files">
          <TestFileUpload />
        </TabsContent>
        
        <TabsContent value="info">
          <div className="prose dark:prose-invert max-w-none">
            <h2>Testing Offline Support</h2>
            <p>
              This page allows you to test the offline support functionality of the application.
              You can simulate going offline by clicking the "Simulate Offline" button, which will
              override the browser's online status detection.
            </p>
            
            <h3>How to Test</h3>
            <ol>
              <li>Create a test document while online</li>
              <li>Click "Simulate Offline" to simulate being offline</li>
              <li>Try to retrieve the document or list all documents</li>
              <li>Create another document while "offline"</li>
              <li>Click "Restore Online" to restore online status</li>
              <li>Check if the documents created while offline are synced to the server</li>
            </ol>
            
            <h3>File Upload Testing</h3>
            <ol>
              <li>Upload files while online to test Vercel Blob integration</li>
              <li>Simulate going offline and test the behavior of the file upload interface</li>
              <li>Test attaching files to messages in both online and offline modes</li>
            </ol>
            
            <h3>What's Being Tested</h3>
            <ul>
              <li>Local storage initialization</li>
              <li>Saving documents to local storage</li>
              <li>Retrieving documents from local storage</li>
              <li>Offline detection and handling</li>
              <li>Synchronization when coming back online</li>
              <li>File uploads with Vercel Blob</li>
              <li>Handling file attachments in messages</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
