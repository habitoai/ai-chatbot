import Dexie, { type Table } from 'dexie';
import type { Message } from 'ai';
import type { Chat } from '@/lib/db/schema';
import type { ArtifactKind } from '@/components/artifact';
import * as fallback from './fallback';

// Import fake-indexeddb for environments where IndexedDB is not available
let fakeIndexedDB: any;
let fakeIDBKeyRange: any;

// Function to dynamically import fake-indexeddb
async function loadFakeIndexedDB() {
  try {
    // Use dynamic import for better compatibility with Next.js
    const fakeIDB = await import('fake-indexeddb');
    fakeIndexedDB = fakeIDB.indexedDB;
    fakeIDBKeyRange = fakeIDB.IDBKeyRange;
    return true;
  } catch (error) {
    console.error('Failed to import fake-indexeddb:', error);
    return false;
  }
}

// Define interfaces for our client-side schema
export interface LocalChat extends Omit<Chat, 'createdAt'> {
  createdAt: Date;
  syncedAt?: Date;
  isDirty?: boolean;
}

export interface LocalMessage {
  id: string;
  chatId: string;
  content: string;
  role: 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool';
  createdAt: Date;
  syncedAt?: Date;
  isDirty?: boolean;
}

export interface LocalDocument {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  createdAt: Date;
  syncedAt?: Date;
  isDirty?: boolean;
}

export interface StoredFile {
  id: string;
  data: File;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
}

// Internal interfaces for database storage
interface StoredChat extends Omit<LocalChat, 'createdAt' | 'syncedAt' | 'isDirty'> {
  createdAt: number; // Store as timestamp
  syncedAt?: number; // Store as timestamp
  isDirty?: 0 | 1; // Store as 0 or 1
}

interface StoredMessage extends Omit<LocalMessage, 'createdAt' | 'syncedAt' | 'isDirty'> {
  createdAt: number; // Store as timestamp
  syncedAt?: number; // Store as timestamp
  isDirty?: 0 | 1; // Store as 0 or 1
}

interface StoredDocument extends Omit<LocalDocument, 'createdAt' | 'syncedAt' | 'isDirty'> {
  createdAt: number; // Store as timestamp
  syncedAt?: number; // Store as timestamp
  isDirty?: 0 | 1; // Store as 0 or 1
}

// Define the database schema
class ChatDatabase extends Dexie {
  // Use any for internal type to avoid TypeScript errors with the hooks
  chats!: Table<any, string>;
  messages!: Table<any, string>;
  documents!: Table<any, string>;
  files!: Table<any, string>;

  constructor() {
    super('NexusChatDatabase');
    
    this.version(1).stores({
      chats: 'id, createdAt, syncedAt, isDirty',
      messages: 'id, chatId, isDirty, createdAt, syncedAt, [chatId+createdAt], [chatId+syncedAt]',
      documents: 'id, userId, isDirty, createdAt, syncedAt, [userId+createdAt], [userId+syncedAt]',
      files: 'id, name, type, size, createdAt'
    });
    
    // Define hooks to ensure Date objects are properly serialized/deserialized
    this.chats.hook('creating', function(primKey, obj: any) {
      // Modify the object in-place
      if (obj.createdAt instanceof Date) {
        obj.createdAt = obj.createdAt.getTime();
      }
      if (obj.syncedAt instanceof Date) {
        obj.syncedAt = obj.syncedAt.getTime();
      }
      
      // Convert boolean to 0/1
      obj.isDirty = obj.isDirty === true ? 1 : 0;
      
      // Return nothing - Dexie will use the modified obj
    });
    
    // Add updating hook for chats
    this.chats.hook('updating', function(modifications: any) {
      // Convert Date objects to timestamps
      if (modifications.syncedAt instanceof Date) {
        modifications.syncedAt = modifications.syncedAt.getTime();
      }
      if (modifications.createdAt instanceof Date) {
        modifications.createdAt = modifications.createdAt.getTime();
      }
      
      // Convert boolean to 0/1
      if ('isDirty' in modifications) {
        modifications.isDirty = modifications.isDirty === true ? 1 : 0;
      }
    });
    
    this.chats.hook('reading', function(obj: any) {
      // Create a copy to avoid modifying the database object
      const readObj: any = { ...obj };
      
      // Convert timestamps to Date objects
      if (typeof readObj.createdAt === 'number') {
        readObj.createdAt = new Date(readObj.createdAt);
      }
      if (typeof readObj.syncedAt === 'number') {
        readObj.syncedAt = new Date(readObj.syncedAt);
      }
      
      // Convert 0/1 to boolean
      readObj.isDirty = readObj.isDirty === 1 ? true : false;
      
      return readObj;
    });
    
    this.messages.hook('creating', function(primKey, obj: any) {
      // Modify the object in-place
      if (obj.createdAt instanceof Date) {
        obj.createdAt = obj.createdAt.getTime();
      }
      if (obj.syncedAt instanceof Date) {
        obj.syncedAt = obj.syncedAt.getTime();
      }
      
      // Convert boolean to 0/1
      obj.isDirty = obj.isDirty === true ? 1 : 0;
      
      // Return nothing - Dexie will use the modified obj
    });
    
    // Add updating hook for messages
    this.messages.hook('updating', function(modifications: any) {
      // Convert Date objects to timestamps
      if (modifications.syncedAt instanceof Date) {
        modifications.syncedAt = modifications.syncedAt.getTime();
      }
      if (modifications.createdAt instanceof Date) {
        modifications.createdAt = modifications.createdAt.getTime();
      }
      
      // Convert boolean to 0/1
      if ('isDirty' in modifications) {
        modifications.isDirty = modifications.isDirty === true ? 1 : 0;
      }
    });
    
    this.messages.hook('reading', function(obj: any) {
      // Create a copy to avoid modifying the database object
      const readObj: any = { ...obj };
      
      // Convert timestamps to Date objects
      if (typeof readObj.createdAt === 'number') {
        readObj.createdAt = new Date(readObj.createdAt);
      }
      if (typeof readObj.syncedAt === 'number') {
        readObj.syncedAt = new Date(readObj.syncedAt);
      }
      
      // Convert 0/1 to boolean
      readObj.isDirty = readObj.isDirty === 1 ? true : false;
      
      return readObj;
    });
    
    // Document hooks for serialization/deserialization
    this.documents.hook('creating', function(primKey, obj: any) {
      // Modify the object in-place
      if (obj.createdAt instanceof Date) {
        obj.createdAt = obj.createdAt.getTime();
      }
      if (obj.syncedAt instanceof Date) {
        obj.syncedAt = obj.syncedAt.getTime();
      }
      
      // Convert boolean to 0/1
      obj.isDirty = obj.isDirty === true ? 1 : 0;
      
      // Return nothing - Dexie will use the modified obj
    });
    
    // Add updating hook for documents
    this.documents.hook('updating', function(modifications: any) {
      // Convert Date objects to timestamps
      if (modifications.syncedAt instanceof Date) {
        modifications.syncedAt = modifications.syncedAt.getTime();
      }
      if (modifications.createdAt instanceof Date) {
        modifications.createdAt = modifications.createdAt.getTime();
      }
      
      // Convert boolean to 0/1
      if ('isDirty' in modifications) {
        modifications.isDirty = modifications.isDirty === true ? 1 : 0;
      }
    });
    
    this.documents.hook('reading', function(obj: any) {
      // Create a copy to avoid modifying the database object
      const readObj: any = { ...obj };
      
      // Convert timestamps to Date objects
      if (typeof readObj.createdAt === 'number') {
        readObj.createdAt = new Date(readObj.createdAt);
      }
      if (typeof readObj.syncedAt === 'number') {
        readObj.syncedAt = new Date(readObj.syncedAt);
      }
      
      // Convert 0/1 to boolean
      readObj.isDirty = readObj.isDirty === 1 ? true : false;
      
      return readObj;
    });
  }
}

// Create and export a singleton instance
export let db: ChatDatabase | undefined;

// Initialize the database with proper fallbacks
async function initializeDatabase() {
  try {
    // Check if IndexedDB is available in the browser
    if (typeof window !== 'undefined' && !window.indexedDB) {
      console.log('Native IndexedDB not available, attempting to load fake-indexeddb');
      // Try to load fake-indexeddb
      const loaded = await loadFakeIndexedDB();
      
      if (loaded) {
        // Configure Dexie to use fake-indexeddb
        Dexie.dependencies.indexedDB = fakeIndexedDB;
        Dexie.dependencies.IDBKeyRange = fakeIDBKeyRange;
        console.log('Successfully configured Dexie to use fake-indexeddb');
      } else {
        // If fake-indexeddb couldn't be loaded, use our fallback
        console.log('Could not load fake-indexeddb, using in-memory fallback');
        fallback.enableFallback();
        return;
      }
    }
    
    // Create the database instance
    db = new ChatDatabase();
    
    // Test database access to ensure it's working
    try {
      await db.chats.count();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error accessing IndexedDB, falling back to in-memory storage:', error);
      fallback.enableFallback();
    }
  } catch (error) {
    console.error('Error initializing IndexedDB, falling back to in-memory storage:', error);
    fallback.enableFallback();
  }
}

// Track initialization status
let dbInitialized = false;

// The database will be initialized in initializeDatabase()

// Initialize the database
if (typeof window !== 'undefined') {
  initializeDatabase().then(() => {
    dbInitialized = true;
  }).catch(error => {
    console.error('Failed to initialize database:', error);
    fallback.enableFallback();
  });
}

// Function to check if the database is initialized
export function isInitialized(): boolean {
  return dbInitialized || fallback.isUsingFallback();
}

// Helper functions for common operations
export async function saveChat(chat: LocalChat): Promise<string> {
  try {
    if (fallback.isUsingFallback()) {
      return fallback.saveChat(chat);
    }
    if (!db) {
      throw new Error('Database not initialized');
    }
    const chatToSave = { ...chat, isDirty: true };
    return await db.chats.put(chatToSave);
  } catch (error) {
    console.error('Error saving chat to IndexedDB, using fallback:', error);
    fallback.enableFallback();
    return fallback.saveChat(chat);
  }
}

export async function saveMessage(message: LocalMessage): Promise<string> {
  try {
    if (fallback.isUsingFallback()) {
      return fallback.saveMessage(message);
    }
    if (!db) {
      throw new Error('Database not initialized');
    }
    const messageToSave = { ...message, isDirty: true };
    return await db.messages.put(messageToSave);
  } catch (error) {
    console.error('Error saving message to IndexedDB, using fallback:', error);
    fallback.enableFallback();
    return fallback.saveMessage(message);
  }
}

export async function getChat(chatId: string): Promise<LocalChat | undefined> {
  try {
    if (fallback.isUsingFallback()) {
      return fallback.getChat(chatId);
    }
    if (!db) {
      throw new Error('Database not initialized');
    }
    return await db.chats.get(chatId);
  } catch (error) {
    console.error('Error getting chat from IndexedDB, using fallback:', error);
    fallback.enableFallback();
    return fallback.getChat(chatId);
  }
}

export async function getChatMessages(chatId: string): Promise<LocalMessage[]> {
  try {
    if (fallback.isUsingFallback()) {
      return fallback.getChatMessages(chatId);
    }
    if (!db) {
      throw new Error('Database not initialized');
    }
    if (!db) {
      throw new Error('Database not initialized');
    }
    return await db.messages.where('chatId').equals(chatId).toArray();
  } catch (error) {
    console.error('Error getting chat messages from IndexedDB, using fallback:', error);
    fallback.enableFallback();
    return fallback.getChatMessages(chatId);
  }
}

export async function getAllChats(): Promise<LocalChat[]> {
  try {
    if (fallback.isUsingFallback()) {
      return fallback.getAllChats();
    }
    if (!db) {
      throw new Error('Database not initialized');
    }
    return await db.chats.toArray();
  } catch (error) {
    console.error('Error getting all chats from IndexedDB, using fallback:', error);
    fallback.enableFallback();
    return fallback.getAllChats();
  }
}

export async function deleteChat(chatId: string): Promise<void> {
  try {
    if (fallback.isUsingFallback()) {
      fallback.deleteChat(chatId);
      return;
    }
    if (!db) {
      throw new Error('Database not initialized');
    }
    await db.chats.delete(chatId);
    await db.messages.where('chatId').equals(chatId).delete();
  } catch (error) {
    console.error('Error deleting chat from IndexedDB, using fallback:', error);
    fallback.enableFallback();
    fallback.deleteChat(chatId);
  }
}

export async function markChatAsSynced(chatId: string): Promise<void> {
  try {
    if (fallback.isUsingFallback()) {
      fallback.markChatAsSynced(chatId);
      return;
    }
    if (!db) {
      throw new Error('Database not initialized');
    }
    const chat = await db.chats.get(chatId);
    if (chat) {
      const updatedChat = { 
        ...chat,
        syncedAt: new Date(),
        isDirty: false
      };
      await db.chats.put(updatedChat);
    }
  } catch (error) {
    console.error('Error marking chat as synced in IndexedDB, using fallback:', error);
    fallback.enableFallback();
    fallback.markChatAsSynced(chatId);
  }
}

export async function markMessageAsSynced(messageId: string): Promise<void> {
  try {
    if (fallback.isUsingFallback()) {
      fallback.markMessageAsSynced(messageId);
      return;
    }
    if (!db) {
      throw new Error('Database not initialized');
    }
    const message = await db.messages.get(messageId);
    if (message) {
      const updatedMessage = {
        ...message,
        syncedAt: new Date(),
        isDirty: false
      };
      await db.messages.put(updatedMessage);
    }
  } catch (error) {
    console.error('Error marking message as synced in IndexedDB, using fallback:', error);
    fallback.enableFallback();
    fallback.markMessageAsSynced(messageId);
  }
}

export async function getDirtyChats(): Promise<LocalChat[]> {
  try {
    if (fallback.isUsingFallback()) {
      return fallback.getDirtyChats();
    }
    if (!db) {
      throw new Error('Database not initialized');
    }
    // Use the isDirty index directly instead of fetching all records
    return await db.chats.where('isDirty').equals(1).toArray();
  } catch (error) {
    console.error('Error getting dirty chats from IndexedDB, using fallback:', error);
    fallback.enableFallback();
    return fallback.getDirtyChats();
  }
}

export async function getDirtyMessages(): Promise<LocalMessage[]> {
  try {
    if (fallback.isUsingFallback()) {
      return fallback.getDirtyMessages();
    }
    if (!db) {
      throw new Error('Database not initialized');
    }
    // Use the isDirty index directly instead of fetching all records
    return await db.messages.where('isDirty').equals(1).toArray();
  } catch (error) {
    console.error('Error getting dirty messages from IndexedDB, using fallback:', error);
    fallback.enableFallback();
    return fallback.getDirtyMessages();
  }
}
