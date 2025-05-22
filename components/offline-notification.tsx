'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useLocalStorageContext } from './local-storage-context';
import { cn } from '@/lib/utils';

export function OfflineNotification() {
  const { isOnline, hasPendingChanges } = useLocalStorageContext();
  const [showNotification, setShowNotification] = useState(false);
  
  // Show notification when going offline
  useEffect(() => {
    if (!isOnline) {
      setShowNotification(true);
      // Hide notification after 5 seconds
      const timer = setTimeout(() => setShowNotification(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (isOnline || !showNotification) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-5">
      <Alert variant="destructive" className="bg-yellow-50 text-yellow-900 border-yellow-500 shadow-md">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>You're offline</AlertTitle>
        <AlertDescription>
          You can continue using the app. Your changes will be saved locally and synced when you reconnect.
        </AlertDescription>
      </Alert>
    </div>
  );
}
