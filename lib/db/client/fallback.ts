/**
 * Fallback mechanism for when IndexedDB fails
 * This provides a simple in-memory storage solution that mimics the basic functionality
 * of our database but without persistence between page reloads
 */

import type { LocalChat, LocalMessage } from './database';

// In-memory storage
const memoryStore = {
  chats: new Map<string, LocalChat>(),
  messages: new Map<string, LocalMessage>(),
};

// Flag to track if we're using fallback mode
let usingFallback = false;

/**
 * Check if we're using fallback mode
 */
export function isUsingFallback(): boolean {
  return usingFallback;
}

/**
 * Enable fallback mode
 */
export function enableFallback(): void {
  usingFallback = true;
  console.warn('Using in-memory fallback storage. Data will not persist between page reloads.');
}

/**
 * Save a chat to the fallback store
 */
export function saveChat(chat: LocalChat): string {
  memoryStore.chats.set(chat.id, { ...chat, isDirty: true });
  return chat.id;
}

/**
 * Save a message to the fallback store
 */
export function saveMessage(message: LocalMessage): string {
  memoryStore.messages.set(message.id, { ...message, isDirty: true });
  return message.id;
}

/**
 * Get a chat by ID
 */
export function getChat(chatId: string): LocalChat | undefined {
  return memoryStore.chats.get(chatId);
}

/**
 * Get messages for a chat
 */
export function getChatMessages(chatId: string): LocalMessage[] {
  return Array.from(memoryStore.messages.values())
    .filter(message => message.chatId === chatId);
}

/**
 * Get all chats
 */
export function getAllChats(): LocalChat[] {
  return Array.from(memoryStore.chats.values());
}

/**
 * Delete a chat and its messages
 */
export function deleteChat(chatId: string): void {
  memoryStore.chats.delete(chatId);
  
  // Delete all messages for this chat
  const messagesToDelete = Array.from(memoryStore.messages.values())
    .filter(message => message.chatId === chatId);
  
  messagesToDelete.forEach(message => {
    memoryStore.messages.delete(message.id);
  });
}

/**
 * Mark a chat as synced
 */
export function markChatAsSynced(chatId: string): void {
  const chat = memoryStore.chats.get(chatId);
  if (chat) {
    memoryStore.chats.set(chatId, {
      ...chat,
      syncedAt: new Date(),
      isDirty: false,
    });
  }
}

/**
 * Mark a message as synced
 */
export function markMessageAsSynced(messageId: string): void {
  const message = memoryStore.messages.get(messageId);
  if (message) {
    memoryStore.messages.set(messageId, {
      ...message,
      syncedAt: new Date(),
      isDirty: false,
    });
  }
}

/**
 * Get dirty chats
 */
export function getDirtyChats(): LocalChat[] {
  return Array.from(memoryStore.chats.values())
    .filter(chat => chat.isDirty === true);
}

/**
 * Get dirty messages
 */
export function getDirtyMessages(): LocalMessage[] {
  return Array.from(memoryStore.messages.values())
    .filter(message => message.isDirty === true);
}

/**
 * Check if there are unsynced changes
 */
export function hasUnsyncedChanges(): boolean {
  return getDirtyChats().length > 0 || getDirtyMessages().length > 0;
}

/**
 * Clear all data (useful for testing)
 */
export function clearAll(): void {
  memoryStore.chats.clear();
  memoryStore.messages.clear();
}
