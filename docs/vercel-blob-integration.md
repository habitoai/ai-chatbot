# Vercel Blob Integration

This document explains how the Vercel Blob integration works in the NexusChat application, including offline support and file upload functionality.

## Overview

The NexusChat application uses [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for file storage, allowing users to upload and share files in chat conversations. The integration includes offline support, enabling users to continue using the application even when they lose internet connectivity.

## Features

- **File Uploads**: Upload images, documents, code files, and other supported file types
- **Offline Support**: Continue using the application and viewing previously uploaded files when offline
- **Automatic Synchronization**: Files uploaded while offline are automatically synchronized when connectivity is restored
- **Visual Indicators**: Clear visual indicators show when files are available only locally

## Setup Requirements

To use the Vercel Blob integration, you need to set up the following environment variables:

```
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

You can obtain a Blob token from the [Vercel Dashboard](https://vercel.com/dashboard) under your project's Storage settings.

## Supported File Types

The following file types are supported for upload:

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- SVG (.svg)

### Documents
- PDF (.pdf)
- Plain Text (.txt)
- Markdown (.md)
- Microsoft Word (.doc, .docx)
- Microsoft Excel (.xls, .xlsx)
- Microsoft PowerPoint (.ppt, .pptx)

### Code Files
- JavaScript (.js)
- TypeScript (.ts)
- JSON (.json)
- HTML (.html)
- CSS (.css)
- Python (.py)

### Other
- ZIP archives (.zip)

## Maximum File Size

The maximum file size for uploads is 20MB.

## How It Works

### Online Mode

1. When a user selects a file for upload, the file is sent to the `/api/files/upload` endpoint
2. The file is validated for type and size
3. If valid, the file is uploaded to Vercel Blob storage
4. The file URL and metadata are returned to the client
5. The file is attached to the message and displayed in the chat

### Offline Mode

1. When a user selects a file for upload while offline, a temporary local URL is created
2. The file is marked as "offline" in the UI
3. When connectivity is restored, the `OfflineAttachmentHandler` component processes any pending uploads
4. Successfully uploaded files are updated with their permanent URLs

## Components

### Core Components

- **MultimodalInput**: Handles file selection and upload in the chat interface
- **PreviewAttachment**: Displays file previews with offline status indicators
- **OfflineAttachmentHandler**: Manages synchronization of files when coming back online

### API Routes

- **/api/files/upload**: Handles file uploads to Vercel Blob storage

## Testing Offline Functionality

You can test the offline functionality using the test page at `/test-offline`. This page allows you to:

1. Simulate going offline
2. Upload files while "offline"
3. Test document creation and retrieval
4. Restore online connectivity and observe synchronization

## Implementation Details

### File Upload Process

```typescript
// Example of the file upload process
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  // Check if we're online
  if (!navigator.onLine) {
    // Handle offline upload
    return {
      url: URL.createObjectURL(file),
      name: file.name,
      contentType: file.type,
      isOffline: true,
    };
  }

  // Proceed with online upload
  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (response.ok) {
    const data = await response.json();
    // Process and return the file data
    return {
      url: data.url,
      name: data.pathname,
      contentType: data.contentType,
    };
  }
};
```

### Offline Detection

The application uses the browser's `navigator.onLine` property and the `online`/`offline` events to detect connectivity changes. When the application detects that the user is offline, it:

1. Shows appropriate UI indicators
2. Stores file metadata locally
3. Creates temporary URLs for offline viewing

### Synchronization

When connectivity is restored, the application:

1. Processes any pending uploads
2. Updates file URLs with their permanent locations
3. Updates the UI to reflect the synchronized state

## Best Practices

- Keep file sizes small for better performance
- Use appropriate file types for different content
- Test offline functionality regularly
- Ensure users have appropriate permissions for file uploads

## Troubleshooting

### Common Issues

- **Upload Failures**: Check your network connection and file size
- **File Type Errors**: Ensure you're uploading a supported file type
- **Synchronization Issues**: Try manually triggering a sync by refreshing the page

### Error Messages

- "File size should be less than 20MB": Reduce the file size
- "Unsupported file type": Use one of the supported file types
- "Upload failed": Check your network connection and try again
