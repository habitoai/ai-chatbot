import { db, getDirtyChats, getDirtyMessages, markChatAsSynced, markMessageAsSynced, isInitialized } from './database';
import type { LocalChat, LocalMessage } from './database';
import { getDirtyDocuments, markDocumentAsSynced } from './documents';
import type { Chat } from '@/lib/db/schema';

// Configuration for sync
const SYNC_INTERVAL = 60000; // 1 minute
let syncInterval: ReturnType<typeof setInterval> | null = null;

// Flag to prevent overlapping sync cycles
let syncInFlight = false;

/**
 * Start the synchronization process
 */
export function startSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  
  // Initial sync
  syncWithServer();
  
  // Set up recurring sync
  syncInterval = setInterval(syncWithServer, SYNC_INTERVAL);
}

/**
 * Stop the synchronization process
 */
export function stopSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

/**
 * Main synchronization function
 */
async function syncWithServer(): Promise<void> {
  // Guard against overlapping sync cycles
  if (syncInFlight) {
    console.log('Sync already in progress, skipping');
    return;
  }
  
  syncInFlight = true;
  
  try {
    // Only sync if we're online
    if (!navigator.onLine) {
      console.log('Offline, skipping sync');
      return;
    }
    
    // Check if database is initialized
    if (!isInitialized()) {
      console.log('Database not initialized, skipping sync');
      return;
    }

    // Push local changes to server
    try {
      await pushChangesToServer();
    } catch (pushError) {
      console.error('Error pushing changes to server:', pushError);
      // Continue with pull even if push fails
    }
    
    // Pull changes from server
    try {
      await pullChangesFromServer();
    } catch (pullError) {
      console.error('Error pulling changes from server:', pullError);
    }
    
    console.log('Sync completed');
  } catch (error) {
    console.error('Error during sync:', error);
  }
}

/**
 * Push local changes to the server
 */
async function pushChangesToServer(): Promise<void> {
  // Get all dirty (modified) chats, messages, and documents
  const dirtyChats = await getDirtyChats();
  const dirtyMessages = await getDirtyMessages();
  const dirtyDocuments = await getDirtyDocuments();
  
  if (dirtyChats.length === 0 && dirtyMessages.length === 0 && dirtyDocuments.length === 0) {
    return; // Nothing to sync
  }
  
  console.log(`Pushing changes: ${dirtyChats.length} chats, ${dirtyMessages.length} messages, ${dirtyDocuments.length} documents`);
  
  // Push chats
  for (const chat of dirtyChats) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: chat.id,
          title: chat.title,
          createdAt: chat.createdAt.toISOString(),
        }),
      });
      
      if (response.ok) {
        await markChatAsSynced(chat.id);
      } else {
        console.error(`Failed to sync chat ${chat.id}:`, await response.text());
      }
    } catch (error) {
      console.error(`Error syncing chat ${chat.id}:`, error);
    }
  }
  
  // Push messages
  for (const message of dirtyMessages) {
    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: message.id,
          chatId: message.chatId,
          content: message.content,
          role: message.role,
          createdAt: message.createdAt.toISOString(),
        }),
      });
      
      if (response.ok) {
        await markMessageAsSynced(message.id);
      } else {
        console.error(`Failed to sync message ${message.id}:`, await response.text());
      }
    } catch (error) {
      console.error(`Error syncing message ${message.id}:`, error);
    }
  }
  
  // Push documents
  for (const document of dirtyDocuments) {
    try {
      const response = await fetch('/api/document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: document.id,
          title: document.title,
          kind: document.kind,
          content: document.content,
          userId: document.userId,
          createdAt: document.createdAt.toISOString(),
        }),
      });
      
      if (response.ok) {
        await markDocumentAsSynced(document.id);
      } else {
        console.error(`Failed to sync document ${document.id}:`, await response.text());
      }
    } catch (error) {
      console.error(`Error syncing document ${document.id}:`, error);
    }
  }
}

/**
 * Pull changes from the server
 */
async function pullChangesFromServer(): Promise<void> {
  try {
    // Check if database is initialized
    if (!db) {
      console.warn('Database not initialized, cannot pull changes from server');
      return;
    }
    
    // Get the timestamp of the last sync
    const lastSync = localStorage.getItem('lastServerSync');
    const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);
    
    // Fetch chats that have been updated since the last sync
    const response = await fetch(`/api/sync?since=${lastSyncDate.toISOString()}`);
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${await response.text()}`);
    }
    
    const { chats, messages } = await response.json();
    
    // Check if database is initialized
    if (!db) {
      console.warn('Database not initialized, cannot pull changes from server');
      return;
    }
    
    // Update local database with server changes
    await db!.transaction('rw', db!.chats, db!.messages, async () => {
      // Update chats
      for (const serverChat of chats) {
        // We've already checked db is initialized above, so we can safely use it
        const localChat = await db!.chats.get(serverChat.id);
        
        // If the local chat doesn't exist or isn't dirty, update it with server data
        if (!localChat || !localChat.isDirty) {
          await db!.chats.put({
            ...serverChat,
            createdAt: new Date(serverChat.createdAt),
            syncedAt: new Date(),
            isDirty: false,
          });
        }
      }
      
      // Update messages
      for (const serverMessage of messages) {
        // We've already checked db is initialized above, so we can safely use it
        const localMessage = await db!.messages.get(serverMessage.id);
        
        // If the local message doesn't exist or isn't dirty, update it with server data
        if (!localMessage || !localMessage.isDirty) {
          await db!.messages.put({
            ...serverMessage,
            createdAt: new Date(serverMessage.createdAt),
            syncedAt: new Date(),
            isDirty: false,
          });
        }
      }
    });
    
    // Update the last sync timestamp
    localStorage.setItem('lastServerSync', new Date().toISOString());
    
    console.log(`Pulled ${chats.length} chats and ${messages.length} messages from server`);
  } catch (error) {
    console.error('Error pulling changes from server:', error);
  }
}

/**
 * Force an immediate synchronization
 */
export async function forceSyncNow(): Promise<void> {
  await syncWithServer();
}

/**
 * Check if there are any unsynchronized changes
 */
export async function hasUnsyncedChanges(): Promise<boolean> {
  try {
    const dirtyChats = await getDirtyChats();
    const dirtyMessages = await getDirtyMessages();
    const dirtyDocuments = await getDirtyDocuments();
    return dirtyChats.length > 0 || dirtyMessages.length > 0 || dirtyDocuments.length > 0;
  } catch (error) {
    console.error('Error checking for unsynced changes:', error);
    return false;
  }
}
