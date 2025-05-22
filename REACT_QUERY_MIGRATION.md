# React Query Migration & Local Storage Implementation

## Overview

This document outlines the migration from SWR to React Query for state management and the implementation of local storage functionality using Dexie.js in the AI Chatbot application.

## Migration from SWR to React Query

### Components Migrated

1. **`document-preview.tsx`**:
   - Replaced `useSWR` with `useQuery` for fetching document data
   - Added null checks for the `kind` property to prevent TypeErrors

2. **`version-footer.tsx`**:
   - Replaced `useSWRConfig` with `useQueryClient` and `useMutation` for document version restoration
   - Implemented optimistic updates for document restoration

3. **`sidebar-history.tsx`**:
   - Replaced `useSWRInfinite` with `useInfiniteQuery` for paginated chat history
   - Implemented proper pagination with `getNextPageParam`
   - Added `useMutation` for chat deletion with optimistic updates

4. **`message-actions.tsx`**:
   - Replaced `useSWRConfig` with `useQueryClient` and `useMutation` for voting functionality
   - Implemented separate mutation hooks for upvoting and downvoting with optimistic updates

5. **`chat.tsx`**:
   - Replaced `useSWR` with `useQuery` for fetching votes
   - Replaced `useSWRConfig` with `useQueryClient` for invalidating chat history

6. **`artifact.tsx`**:
   - Replaced `useSWR` with `useQuery` for fetching documents
   - Replaced `useSWRConfig` with `useQueryClient` and `useMutation` for document updates
   - Implemented optimistic updates for document content changes

### Setup

The React Query provider is implemented in `components/query-provider.tsx` and integrated into the application layout in `app/layout.tsx`.

## Local Storage Implementation with Dexie.js

### Database Schema

The local database schema is defined in `lib/db/client/database.ts` and includes:

- **Chats**: Stores chat information including title, creation date, and sync status
- **Messages**: Stores message content, role, and sync status

### Synchronization

The synchronization logic is implemented in `lib/db/client/sync.ts` and includes:

- **Push changes**: Sends local changes to the server when online
- **Pull changes**: Retrieves server changes and updates local database
- **Automatic sync**: Periodically syncs data when online
- **Manual sync**: Allows forcing a sync operation

### Offline Support

The application now supports offline functionality:

- **Offline detection**: Monitors network status and updates UI accordingly
- **Local storage**: Saves chat and message data locally when offline
- **Sync on reconnect**: Automatically syncs data when the connection is restored
- **UI indicators**: Shows sync status and offline notifications

### Components Added

1. **`local-storage-provider.tsx`**:
   - Provides a context for local storage operations
   - Manages online/offline status

2. **`sync-status.tsx`**:
   - Displays the current sync status in the UI
   - Shows when the application is working offline
   - Indicates when changes are being synced

3. **`offline-notification.tsx`**:
   - Shows a notification when the user goes offline
   - Informs users that their changes will be saved locally

### Hooks Added

1. **`use-local-storage.ts`**:
   - Provides methods for interacting with the local database
   - Manages synchronization with the server

2. **`use-network-status.ts`**:
   - Monitors network status changes
   - Provides online/offline status to components

## API Endpoints

A new API endpoint was added to support synchronization:

- **`/api/sync`**: Handles synchronization between the client and server
  - `GET`: Retrieves changes from the server
  - `POST`: Sends local changes to the server

## Benefits of the Migration

1. **Improved state management**: React Query provides more powerful tools for managing server state
2. **Offline support**: Users can continue using the application when offline
3. **Data persistence**: User data is preserved locally and synced when online
4. **Better UX**: Optimistic updates provide a more responsive user experience
5. **Type safety**: Improved TypeScript integration across components

## Future Improvements

1. **Conflict resolution**: Implement more sophisticated conflict resolution for sync operations
2. **Selective sync**: Allow users to choose what data to sync
3. **Compression**: Compress data for more efficient storage and transfer
4. **Background sync**: Implement service workers for background synchronization
