'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { useLocalStorageContext } from './local-storage-context';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { ArtifactKind } from './artifact';
import { generateUUID } from '@/lib/utils';
import { useSession } from 'next-auth/react';

/**
 * Test component for offline document functionality
 * This is for development/testing only and should be removed in production
 */
export function TestOfflineDocument() {
  const { data: session } = useSession();
  const { isInitialized, isOnline, saveDocument, getDocument, getDocuments } = useLocalStorageContext();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testDocumentId, setTestDocumentId] = useState<string>('');

  // Add a test result message
  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message]);
    console.log(message);
  };

  // Create a test document in local storage
  const createTestDocument = async () => {
    if (!isInitialized) {
      toast.error('Local storage not initialized');
      return;
    }

    if (!session?.user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      // Generate a unique ID for the test document
      const docId = generateUUID();
      
      // Save the document to local storage
      await saveDocument({
        id: docId,
        title: `Test Document ${new Date().toLocaleTimeString()}`,
        kind: 'text' as ArtifactKind,
        content: 'This is a test document created for offline testing.',
        userId: session.user.id,
        createdAt: new Date(),
      });
      
      setTestDocumentId(docId);
      addResult(`Created test document with ID: ${docId}`);
      toast.success('Test document created');
    } catch (error) {
      console.error('Error creating test document:', error);
      addResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Failed to create test document');
    }
  };

  // Retrieve the test document from local storage
  const retrieveTestDocument = async () => {
    if (!testDocumentId) {
      toast.error('No test document ID available');
      return;
    }

    try {
      const document = await getDocument(testDocumentId);
      
      if (document) {
        addResult(`Retrieved document: ${JSON.stringify({
          id: document.id,
          title: document.title,
          kind: document.kind,
          content: document.content.substring(0, 50) + '...',
          createdAt: document.createdAt
        }, null, 2)}`);
        toast.success('Document retrieved successfully');
      } else {
        addResult('Document not found in local storage');
        toast.error('Document not found');
      }
    } catch (error) {
      console.error('Error retrieving document:', error);
      addResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Failed to retrieve document');
    }
  };

  // List all documents in local storage
  const listAllDocuments = async () => {
    if (!session?.user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const documents = await getDocuments(session.user.id);
      
      addResult(`Found ${documents.length} documents in local storage`);
      
      if (documents.length > 0) {
        documents.forEach((doc, index) => {
          addResult(`${index + 1}. ${doc.title} (${doc.id.substring(0, 8)}...)`);
        });
        toast.success(`Found ${documents.length} documents`);
      } else {
        toast.info('No documents found');
      }
    } catch (error) {
      console.error('Error listing documents:', error);
      addResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Failed to list documents');
    }
  };

  // Clear test results
  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Offline Document Test</CardTitle>
        <CardDescription>
          Test the offline document functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-2">
            <Button onClick={createTestDocument} disabled={!isInitialized || !session?.user}>
              Create Test Document
            </Button>
            <Button onClick={retrieveTestDocument} disabled={!testDocumentId}>
              Retrieve Test Document
            </Button>
            <Button onClick={listAllDocuments} disabled={!isInitialized || !session?.user}>
              List All Documents
            </Button>
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          </div>
          
          <div className="bg-muted p-4 rounded-md h-64 overflow-y-auto">
            <h3 className="text-sm font-medium mb-2">Test Results:</h3>
            {testResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No results yet. Run a test to see output here.</p>
            ) : (
              <div className="space-y-1">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono whitespace-pre-wrap">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm">
          <span className="font-medium">Status:</span>{' '}
          {isInitialized ? (
            <span className="text-green-500">Initialized</span>
          ) : (
            <span className="text-red-500">Not Initialized</span>
          )}{' '}
          | {isOnline ? (
            <span className="text-green-500">Online</span>
          ) : (
            <span className="text-red-500">Offline</span>
          )}
        </div>
        {testDocumentId && (
          <div className="text-sm">
            <span className="font-medium">Test Document ID:</span>{' '}
            <code className="bg-muted px-1 py-0.5 rounded">{testDocumentId.substring(0, 8)}...</code>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
