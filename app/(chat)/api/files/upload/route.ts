import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateUUID } from '@/lib/utils';

import { auth } from '@/app/(auth)/auth';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 20 * 1024 * 1024, {
      message: 'File size should be less than 20MB',
    })
    // Support a wider range of file types as specified in the PRD
    .refine((file) => [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf', 'text/plain', 'text/markdown', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Code files
      'text/javascript', 'application/json', 'text/html', 'text/css',
      'application/x-python-code', 'text/x-python', 'text/x-typescript',
      // Other
      'application/zip', 'application/x-zip-compressed'
    ].includes(file.type), {
      message: 'Unsupported file type. Please upload an image, document, code file, or zip archive.',
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const originalFilename = (formData.get('file') as File).name;
    
    // Generate a unique filename to prevent conflicts
    const uniqueId = generateUUID().slice(0, 8);
    const fileExtension = originalFilename.split('.').pop() || '';
    const filename = fileExtension
      ? `${uniqueId}-${Date.now()}.${fileExtension}`
      : `${uniqueId}-${Date.now()}`;
    
    const fileBuffer = await file.arrayBuffer();

    try {
      // Upload to Vercel Blob with the unique filename
      const data = await put(filename, fileBuffer, {
        access: 'public',
        contentType: file.type,
        addRandomSuffix: false, // We're already adding our own unique ID
      });

      // Return enhanced response with additional metadata
      return NextResponse.json({
        ...data,
        originalName: originalFilename,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        userId: session.user?.id,
      });
    } catch (error) {
      console.error('Vercel Blob upload error:', error);
      return NextResponse.json({ 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
