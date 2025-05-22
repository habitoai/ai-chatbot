'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { SyncStatus } from './sync-status';

// Create a context for the local storage
const LocalStorageContext = createContext<ReturnType<typeof useLocalStorage> | null>(null);

export function useLocalStorageContext() {
  const context = useContext(LocalStorageContext);
  if (!context) {
    throw new Error('useLocalStorageContext must be used within a LocalStorageProvider');
  }
  return context;
}

export function LocalStorageProvider({ children }: { children: React.ReactNode }) {
  const localStorageUtils = useLocalStorage();
  const { isOnline } = useNetworkStatus();
  const [isReady, setIsReady] = useState(false);

  // Wait for local storage to initialize before rendering children
  useEffect(() => {
    if (localStorageUtils.isInitialized) {
      setIsReady(true);
    }
  }, [localStorageUtils.isInitialized]);
  
  // Update online status in local storage when network status changes
  useEffect(() => {
    if (localStorageUtils.isInitialized) {
      // This will trigger appropriate UI updates in components that use the context
      localStorageUtils.updateOnlineStatus(isOnline);
      
      // If we just came back online, trigger a sync
      if (isOnline) {
        localStorageUtils.syncNow().catch(error => {
          console.error('Failed to sync after coming online:', error);
        });
      }
    }
  }, [isOnline, localStorageUtils]);

  return (
    <LocalStorageContext.Provider value={localStorageUtils}>
      {children}
      
      {/* Add the sync status component to the bottom of the sidebar */}
      <div className="fixed bottom-0 left-0 p-2 z-50">
        <SyncStatus />
      </div>
    </LocalStorageContext.Provider>
  );
}
