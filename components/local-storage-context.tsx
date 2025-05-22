'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { 
  getAllChats, 
  getChatMessages as getDbChatMessages, 
  getChat as getDbChat,
  saveChat as saveDbChat,
  saveMessage as saveDbMessage,
  deleteChat as deleteDbChat
} from '@/lib/db/client/database';
import type { LocalChat, LocalMessage, LocalDocument } from '@/lib/db/client/database';
import {
  getDocumentsById as getDbDocumentsById,
  saveDocument as saveDbDocument,
  deleteDocument as deleteDbDocument,
  markDocumentAsSynced,
  getDocumentsByUserId
} from '@/lib/db/client/documents';
import { startSync, stopSync, forceSyncNow, hasUnsyncedChanges } from '@/lib/db/client/sync';
import { generateUUID } from '@/lib/utils';
import type { Message } from 'ai';

interface LocalStorageContextProps {
  isInitialized: boolean;
  isOnline: boolean;
  hasPendingChanges: boolean;
  syncNow: () => Promise<void>;
  // Chat methods
  getChats: () => Promise<LocalChat[]>;
  getChat: (chatId: string) => Promise<LocalChat | undefined>;
  getChatMessages: (chatId: string) => Promise<LocalMessage[]>;
  saveChat: (chat: Partial<LocalChat> & { title: string; userId: string; visibility: string }) => Promise<string>;
  saveMessage: (message: Partial<LocalMessage> & { chatId: string; role: string; content: string }) => Promise<string>;
  removeChatAndMessages: (chatId: string) => Promise<void>;
  addMessage: (chatId: string, message: any) => Promise<string>;
  getMessages: (chatId: string) => Promise<LocalMessage[]>;
  // Document methods
  getDocument: (documentId: string) => Promise<LocalDocument | undefined>;
  getDocuments: (userId: string) => Promise<LocalDocument[]>;
  saveDocument: (document: Partial<LocalDocument> & { title: string; userId: string; kind: string; content: string }) => Promise<string>;
  removeDocument: (documentId: string) => Promise<void>;
}

const LocalStorageContext = createContext<LocalStorageContextProps | undefined>(undefined);

export function LocalStorageProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Initialize the database and sync on component mount
  useEffect(() => {
    const initializeDb = async () => {
      try {
        // Wait for a short delay to ensure the database is properly initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
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

    initializeDb();

    // Set up online/offline event listeners
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Clean up on unmount
    return () => {
      stopSync();
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Check for pending changes periodically
  useEffect(() => {
    const checkPendingChanges = async () => {
      try {
        const hasChanges = await hasUnsyncedChanges();
        setHasPendingChanges(hasChanges);
      } catch (error) {
        console.error('Error checking for pending changes:', error);
      }
    };

    // Check immediately
    checkPendingChanges();

    // Then check every 5 seconds
    const interval = setInterval(checkPendingChanges, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Force a sync now
  const syncNow = useCallback(async () => {
    try {
      await forceSyncNow();
      const hasChanges = await hasUnsyncedChanges();
      setHasPendingChanges(hasChanges);
    } catch (error) {
      console.error('Error during manual sync:', error);
    }
  }, []);

  // Get all chats
  const getChats = useCallback(async () => {
    return await getAllChats();
  }, []);

  // Get a specific chat
  const getChat = useCallback(async (chatId: string) => {
    return await getDbChat(chatId);
  }, []);

  // Get messages for a chat
  const getChatMessages = useCallback(async (chatId: string) => {
    return await getDbChatMessages(chatId);
  }, []);

  // Save a chat
  const saveChat = useCallback(async (chat: Partial<LocalChat> & { title: string; userId: string; visibility: string }) => {
    const newChat: LocalChat = {
      ...chat,
      id: chat.id || generateUUID(),
      createdAt: new Date(),
      syncedAt: undefined,
      isDirty: true,
    };
    
    const chatId = await saveDbChat(newChat);
    setHasPendingChanges(true);
    return chatId;
  }, []);

  // Save a message
  const saveMessage = useCallback(async (message: Partial<LocalMessage> & { chatId: string; role: string; content: string }) => {
    const newMessage: LocalMessage = {
      ...message,
      id: message.id || generateUUID(),
      createdAt: new Date(),
      syncedAt: undefined,
      isDirty: true,
    };
    
    const messageId = await saveDbMessage(newMessage);
    setHasPendingChanges(true);
    return messageId;
  }, []);

  // Remove a chat and its messages
  const removeChatAndMessages = useCallback(async (chatId: string) => {
    await deleteDbChat(chatId);
    setHasPendingChanges(true);
  }, []);

  // Implementation for compatibility with existing components
  const addMessage = async (chatId: string, message: any): Promise<string> => {
    const messageToSave = {
      ...message,
      chatId,
      role: message.role || 'user',
      content: message.content || '',
    };
    return await saveMessage(messageToSave);
  };
  
  const getMessages = getChatMessages;

  // Document methods
  const getDocument = useCallback(async (documentId: string): Promise<LocalDocument | undefined> => {
    try {
      const documents = await getDbDocumentsById(documentId);
      return documents.length > 0 ? documents[0] : undefined;
    } catch (error) {
      console.error('Error getting document:', error);
      return undefined;
    }
  }, []);

  const getDocuments = useCallback(async (userId: string): Promise<LocalDocument[]> => {
    try {
      return await getDocumentsByUserId(userId);
    } catch (error) {
      console.error('Error getting documents:', error);
      return [];
    }
  }, []);

  const saveDocument = useCallback(async (document: Partial<LocalDocument> & { title: string; userId: string; kind: string; content: string }): Promise<string> => {
    try {
      const newDocument: Omit<LocalDocument, 'syncedAt' | 'isDirty'> = {
        ...document,
        id: document.id || generateUUID(),
        createdAt: document.createdAt || new Date(),
      };
      
      const documentId = await saveDbDocument(newDocument);
      setHasPendingChanges(true);
      return documentId;
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }, []);

  const removeDocument = useCallback(async (documentId: string): Promise<void> => {
    try {
      await deleteDbDocument(documentId);
      setHasPendingChanges(true);
    } catch (error) {
      console.error('Error removing document:', error);
      throw error;
    }
  }, []);

  const value = {
    isInitialized,
    isOnline,
    hasPendingChanges,
    syncNow,
    getChats,
    getChat,
    getChatMessages,
    saveChat,
    saveMessage,
    removeChatAndMessages,
    addMessage,
    getMessages,
    // Document methods
    getDocument,
    getDocuments,
    saveDocument,
    removeDocument,
  };

  return (
    <LocalStorageContext.Provider value={value}>
      {children}
    </LocalStorageContext.Provider>
  );
}

export function useLocalStorageContext() {
  const context = useContext(LocalStorageContext);
  
  if (context === undefined) {
    throw new Error('useLocalStorageContext must be used within a LocalStorageProvider');
  }
  
  return context;
}
