/**
 * Client-side document storage and synchronization
 */
import { generateUUID } from '@/lib/utils';
import { db, isInitialized } from './database';

// Use the LocalDocument interface from database.ts
import type { LocalDocument } from './database';

// The documents table is now part of the initial schema, so no need for initialization

// Save a document to local storage
export async function saveDocument(document: Omit<LocalDocument, 'syncedAt' | 'isDirty'>): Promise<string> {
  try {
    const docToSave: LocalDocument = {
      ...document,
      id: document.id || generateUUID(),
      createdAt: document.createdAt || new Date(),
      syncedAt: undefined,
      isDirty: true
    };
    
    if (!db) {
      throw new Error('Database not initialized');
    }
    await db.table('documents').put(docToSave);
    return docToSave.id;
  } catch (error) {
    console.error('Error saving document to local storage:', error);
    throw error;
  }
}

// Get documents by ID
export async function getDocumentsById(id: string): Promise<LocalDocument[]> {
  try {
    // Special case for 'init' document ID which is used for initialization
    if (id === 'init') {
      console.info('Initialization document requested, returning empty array');
      return [];
    }
    
    // Validate the ID parameter
    if (!id || id === 'undefined') {
      console.warn('Invalid document ID provided:', id);
      return [];
    }
    
    if (!db) {
      throw new Error('Database not initialized');
    }
    const documents = await db.table('documents')
      .where('id')
      .equals(id)
      .toArray();
      
    return documents;
  } catch (error) {
    console.error('Error getting documents from local storage:', error);
    return [];
  }
}

// Get all documents for a user
export async function getDocumentsByUserId(userId: string): Promise<LocalDocument[]> {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const documents = await db.table('documents')
      .where('userId')
      .equals(userId)
      .toArray();
      
    return documents;
  } catch (error) {
    console.error('Error getting user documents from local storage:', error);
    return [];
  }
}

// Delete a document
export async function deleteDocument(id: string): Promise<void> {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    await db.table('documents').delete(id);
  } catch (error) {
    console.error('Error deleting document from local storage:', error);
  }
}

// Mark a document as synced
export async function markDocumentAsSynced(id: string): Promise<void> {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const doc = await db.table('documents').get(id);
    if (doc) {
      const updatedDoc = {
        ...doc,
        syncedAt: new Date(),
        isDirty: false
      };
      await db.table('documents').put(updatedDoc);
    }
  } catch (error) {
    console.error('Error marking document as synced:', error);
  }
}

// Get dirty documents that need to be synced
export async function getDirtyDocuments(): Promise<LocalDocument[]> {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const allDocs = await db.table('documents').toArray();
    return allDocs.filter(doc => doc.isDirty === true);
  } catch (error) {
    console.error('Error getting dirty documents:', error);
    return [];
  }
}
