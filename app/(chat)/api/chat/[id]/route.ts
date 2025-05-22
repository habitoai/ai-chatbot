import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getChatById } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/error'; // Import the shared error class

// Using the shared ChatSDKError class from @/lib/error

/**
 * GET handler for retrieving a chat by ID
 * This endpoint provides a fallback for when the server database doesn't have the chat
 * but it might exist in local storage
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    try {
      // First try to get the chat from the server database
      // Pass the user ID to ensure ownership check
      const chat = await getChatById({ id: params.id, userId: session.user.id });
      return NextResponse.json({ chat });
    } catch (error) {
      // If the chat doesn't exist in the server database,
      // return a 404 status but with a special flag that indicates
      // the client should check local storage
      return NextResponse.json(
        { 
          error: 'Chat not found in server database',
          checkLocalStorage: true 
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error retrieving chat:', error);
    
    if (error instanceof ChatSDKError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    
    // Handle unknown errors
    const unknownError = error as Error;
    return NextResponse.json(
      { error: unknownError.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
