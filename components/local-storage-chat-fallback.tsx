'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorageContext } from '@/components/local-storage-context';
import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';

interface LocalStorageChatFallbackProps {
  chatId: string;
}

/**
 * Component that checks local storage for a chat when it's not found in the server database
 */
export function LocalStorageChatFallback({ chatId }: LocalStorageChatFallbackProps) {
  const [isLoading, setIsLoading] = useState(true);
  interface LocalMessage { id: string; role: 'user'|'assistant'|'system'|'function'|'data'|'tool'; content: string; chatId: string; createdAt: Date }
  interface LocalChat { id: string; visibility: 'private'|'public'; title: string; userId: string; createdAt: Date }
  
  const [localChat, setLocalChat] = useState<LocalChat | null>(null);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const { getChat, getChatMessages, isInitialized } = useLocalStorageContext();
  const router = useRouter();

  useEffect(() => {
    // Only try to fetch from local storage once it's initialized
    if (!isInitialized) {
      return;
    }

    let cancelled = false;
    
    (async () => {
      try {
        // Try to get the chat from local storage
        const chat = await getChat(chatId);
        
        if (chat && !cancelled) {
          setLocalChat(chat);
          
          // Get messages for this chat
          const messages = await getChatMessages(chatId);
          if (!cancelled) {
            setLocalMessages(messages);
            toast.info('This chat was found in local storage but not on the server. Changes will be synced when online.');
          }
        } else if (!cancelled) {
          // If not found in local storage either, redirect to 404
          router.push('/chat');
          toast.error('Chat not found in local storage or on the server.');
        }
      } catch (error) {
        console.error('Error fetching chat from local storage:', error);
        if (!cancelled) {
          router.push('/chat');
          toast.error('Error loading chat from local storage.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    
    return () => { cancelled = true; };
  }, [chatId, getChat, getChatMessages, isInitialized, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            'h-6 w-6 animate-spin rounded-full border-2',
            'border-primary border-t-transparent'
          )} />
          <p className="text-sm text-muted-foreground">
            Looking for chat in local storage...
          </p>
        </div>
      </div>
    );
  }

  if (!localChat) {
    return null; // Will be redirected by the useEffect
  }

  // Convert local messages to the format expected by the Chat component
  const uiMessages: UIMessage[] = localMessages.map(message => ({
    id: message.id,
    role: message.role as UIMessage['role'],
    content: message.content || '',
    createdAt: new Date(message.createdAt),
    parts: [{ type: 'text', text: message.content || '' }],
  }));

  // Mock session for offline mode
  const mockSession = {
    user: {
      id: 'offline-user',
      name: 'Offline User',
      email: 'offline@example.com',
      image: null
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  return (
    <div className="group w-full h-full flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 flex items-center justify-center h-10 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm">
        This chat is currently only available offline. Changes will be synced when you're back online.
      </div>
      <Chat
        id={chatId}
        initialMessages={uiMessages}
        initialChatModel={DEFAULT_CHAT_MODEL}
        initialVisibilityType={localChat.visibility as any || 'private'}
        isReadonly={false}
        session={mockSession as any}
        autoResume={false}
      />
    </div>
  );
}
