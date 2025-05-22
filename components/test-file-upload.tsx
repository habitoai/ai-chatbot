'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { useLocalStorageContext } from './local-storage-context';
import { PreviewAttachment } from './preview-attachment';
import { FileIcon, PaperclipIcon } from './icons';
import type { Attachment } from 'ai';

/**
 * Test component for file upload functionality with Vercel Blob
 * This is for development/testing only
 */
export function TestFileUpload() {
  const { isOnline } = useLocalStorageContext();
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const [testResults, setTestResults] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add a test result message
  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message]);
    console.log(message);
  };

  // Clear test results
  const clearResults = () => {
    setTestResults([]);
  };

  // Upload a file to Vercel Blob
  const uploadFile = async (file: File) => {
    addResult(`Starting upload for file: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)`);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;
        
        addResult(`Upload successful: ${pathname}`);
        addResult(`URL: ${url}`);
        
        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      
      const { error } = await response.json();
      addResult(`Upload error: ${error}`);
      toast.error(error);
    } catch (error) {
      addResult(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Failed to upload file, please try again!');
    }
  };

  // Handle file selection
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) {
      return;
    }
    
    addResult(`Selected ${files.length} file(s) for upload`);
    setUploadQueue(files.map((file) => file.name));

    try {
      const uploadPromises = files.map((file) => uploadFile(file));
      const uploadedAttachments = await Promise.all(uploadPromises);
      const successfullyUploadedAttachments = uploadedAttachments.filter(
        (attachment) => attachment !== undefined,
      ) as Attachment[];

      setAttachments((currentAttachments) => [
        ...currentAttachments,
        ...successfullyUploadedAttachments,
      ]);
      
      addResult(`Successfully uploaded ${successfullyUploadedAttachments.length} file(s)`);
    } catch (error) {
      addResult(`Error during upload process: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Error uploading files!', error);
    } finally {
      setUploadQueue([]);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Trigger file selection dialog
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  // Remove an attachment
  const removeAttachment = (index: number) => {
    setAttachments((current) => {
      const updated = [...current];
      updated.splice(index, 1);
      return updated;
    });
    addResult(`Removed attachment at index ${index}`);
  };

  // Simulate sending a message with attachments
  const simulateSendMessage = () => {
    if (attachments.length === 0) {
      toast.error('No attachments to send');
      return;
    }
    
    addResult(`Simulating message send with ${attachments.length} attachment(s):`);
    attachments.forEach((attachment, index) => {
      addResult(`${index + 1}. ${attachment.name} (${attachment.contentType})`);
    });
    
    toast.success(`Simulated sending message with ${attachments.length} attachment(s)`);
    
    // Clear attachments after "sending"
    setAttachments([]);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto my-8">
      <CardHeader>
        <CardTitle>File Upload Test</CardTitle>
        <CardDescription>
          Test file uploads with Vercel Blob integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-2">
            <Button 
              onClick={handleAttachmentClick} 
              variant="outline"
              className="gap-2"
            >
              <PaperclipIcon size={16} />
              Attach Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/javascript,application/json,text/html,text/css,application/x-python-code,text/x-python"
            />
            <Button 
              onClick={simulateSendMessage} 
              disabled={attachments.length === 0}
            >
              Simulate Send Message
            </Button>
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          </div>
          
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 p-4 bg-muted rounded-md">
              {attachments.map((attachment, index) => (
                <PreviewAttachment
                  key={`${attachment.name}-${index}`}
                  attachment={attachment}
                  onRemove={() => removeAttachment(index)}
                />
              ))}
            </div>
          )}
          
          {/* Upload queue */}
          {uploadQueue.length > 0 && (
            <div className="flex flex-col gap-2 p-4 bg-muted rounded-md">
              <h3 className="text-sm font-medium">Uploading:</h3>
              {uploadQueue.map((filename, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FileIcon size={16} />
                  <span>{filename}</span>
                  <span className="ml-auto animate-pulse">Uploading...</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Test results */}
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
          <span className="font-medium">Network Status:</span>{' '}
          {isOnline ? (
            <span className="text-green-500">Online</span>
          ) : (
            <span className="text-red-500">Offline</span>
          )}
        </div>
        <div className="text-sm">
          <span className="font-medium">Attachments:</span>{' '}
          <span className="bg-muted px-2 py-0.5 rounded-full">{attachments.length}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
