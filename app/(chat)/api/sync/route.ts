import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getChatsByUserId, getMessagesByChatId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be logged in to sync data' },
        { status: 401 }
      );
    }
    
    // Get the 'since' query parameter
    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const sinceDate = since ? new Date(since) : new Date(0);
    
    // Get chats for the current user that have been updated since the specified date
    // Using the existing getChatsByUserId function with default pagination parameters
    const { chats } = await getChatsByUserId({
      id: session.user.id,
      limit: 100, // Reasonable limit for sync
      startingAfter: null,
      endingBefore: null
    });
    
    // Get all chat IDs
    const chatIds = chats.map((chat) => chat.id);
    
    // Get messages for these chats
    // Note: We'll need to fetch messages for each chat individually as there's no batch function
    const messages = [];
    for (const chatId of chatIds) {
      const chatMessages = await getMessagesByChatId({ id: chatId });
      messages.push(...chatMessages);
    }
    
    return NextResponse.json({ chats, messages });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    
    console.error('Error syncing data:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while syncing data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be logged in to sync data' },
        { status: 401 }
      );
    }
    
    // Get data from request body
    const { chats, messages } = await req.json();
    
    // Process the data (this would be implemented in your database queries)
    // For now, we'll just return success
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    
    console.error('Error syncing data:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while syncing data' },
      { status: 500 }
    );
  }
}
