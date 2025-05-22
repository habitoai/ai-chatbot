import { useCallback, useEffect, useState } from 'react';
import { db, getAllChats, getChatMessages, saveChat, saveMessage, deleteChat } from '@/lib/db/client/database';
import type { LocalChat, LocalMessage } from '@/lib/db/client/database';
import { startSync, stopSync, forceSyncNow, hasUnsyncedChanges } from '@/lib/db/client/sync';
import { generateUUID } from '@/lib/utils';
import type { Message } from 'ai';

export function useLocalStorage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Initialize the database and sync on component mount
  useEffect(() => {
    const initializeDb = async () => {
      try {
        // Check for pending changes
        const hasChanges = await hasUnsyncedChanges();
        setHasPendingChanges(hasChanges);
        
        // Start sync process
        startSync();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize local storage:', error);
        // Set initialized to true anyway to prevent blocking the app
        setIsInitialized(true);
        // Show error toast to user
        if (typeof window !== 'undefined') {
          // Use setTimeout to ensure toast is called after component is mounted
          setTimeout(() => {
            try {
              // Try to use the toast notification if available
              const toast = require('sonner').toast;
              toast.error('Failed to initialize offline storage. Some features may not work properly.');
            } catch (e) {
              // Fallback to console if toast is not available
              console.error('Could not show toast notification:', e);
            }
          }, 1000);
        }
      }
    };

    // Set up online/offline detection
    const handleOnline = () => {
      setIsOnline(true);
      forceSyncNow(); // Try to sync immediately when we come back online
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial online state
    setIsOnline(navigator.onLine);
    
    initializeDb();

    // Clean up
    return () => {
      stopSync();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for pending changes periodically
  useEffect(() => {
    const checkPendingChanges = async () => {
      const hasChanges = await hasUnsyncedChanges();
      setHasPendingChanges(hasChanges);
    };

    const interval = setInterval(checkPendingChanges, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Create a new chat
  const createChat = useCallback(async (title: string, userId?: string): Promise<LocalChat> => {
    const newChat: LocalChat = {
      id: generateUUID(),
      title,
      createdAt: new Date(),
      userId: userId || 'local-user', // Default user ID if not provided
      visibility: 'private' as const, // Default to private
      isDirty: true,
    };
    
    await saveChat(newChat);
    setHasPendingChanges(true);
    
    return newChat;
  }, []);

  // Save a message to a chat
  const addMessage = useCallback(async (chatId: string, message: Message): Promise<LocalMessage> => {
    const newMessage: LocalMessage = {
      id: message.id || generateUUID(),
      chatId,
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      role: message.role,
      createdAt: new Date(),
      isDirty: true,
    };
    
    await saveMessage(newMessage);
    setHasPendingChanges(true);
    
    return newMessage;
  }, []);

  // Get all chats
  const getChats = useCallback(async (): Promise<LocalChat[]> => {
    return await getAllChats();
  }, []);

  // Get messages for a specific chat
  const getMessages = useCallback(async (chatId: string): Promise<LocalMessage[]> => {
    return await getChatMessages(chatId);
  }, []);

  // Delete a chat and all its messages
  const removeChatAndMessages = useCallback(async (chatId: string): Promise<void> => {
    await deleteChat(chatId);
    setHasPendingChanges(true);
  }, []);

  // Force a sync with the server
  const syncNow = useCallback(async (): Promise<void> => {
    await forceSyncNow();
    const hasChanges = await hasUnsyncedChanges();
    setHasPendingChanges(hasChanges);
  }, []);

  // Method to manually update online status
  const updateOnlineStatus = useCallback((online: boolean) => {
    setIsOnline(online);
  }, []);

  return {
    isInitialized,
    isOnline,
    hasPendingChanges,
    createChat,
    addMessage,
    getChats,
    getMessages,
    removeChatAndMessages,
    syncNow,
    updateOnlineStatus,
  };
}
