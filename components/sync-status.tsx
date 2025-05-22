'use client';

import { useEffect, useState } from 'react';
import { useLocalStorageContext } from '@/components/local-storage-context';
import { cn } from '@/lib/utils';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export function SyncStatus() {
  const { isOnline, hasPendingChanges, syncNow } = useLocalStorageContext();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Show tooltip for a short time when status changes
  useEffect(() => {
    if (!isOnline || hasPendingChanges) {
      setShowTooltip(true);
      const timer = setTimeout(() => setShowTooltip(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, hasPendingChanges]);

  const handleSyncClick = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      await syncNow();
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Determine status text and icon
  let statusText = 'All changes synced';
  let statusIcon = <Cloud className="h-4 w-4" />;
  let statusColor = 'text-green-500';

  if (!isOnline) {
    statusText = 'Offline mode';
    statusIcon = <CloudOff className="h-4 w-4" />;
    statusColor = 'text-yellow-500';
  } else if (hasPendingChanges) {
    statusText = 'Pending changes';
    statusIcon = <Cloud className="h-4 w-4" />;
    statusColor = 'text-yellow-500';
  }

  if (isSyncing) {
    statusText = 'Syncing...';
    statusIcon = <RefreshCw className="h-4 w-4 animate-spin" />;
    statusColor = 'text-blue-500';
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("flex items-center gap-2 px-2 py-1", statusColor)}
            onClick={handleSyncClick}
            disabled={!isOnline || isSyncing}
          >
            {statusIcon}
            <span className="text-xs">{statusText}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {!isOnline ? (
            <p>You are currently offline. Changes will sync when you reconnect.</p>
          ) : hasPendingChanges ? (
            <p>You have unsaved changes that will sync automatically. Click to sync now.</p>
          ) : (
            <p>All your changes are synced with the server.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
