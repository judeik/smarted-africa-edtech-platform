/**
 * useOfflineSync — manages connectivity state, background sync, and offline queue.
 */
import { useState, useEffect, useCallback } from 'react';
import { getUnsyncedAttempts, markAttemptSynced, clearSyncedAttempts, getStorageInfo } from '../lib/offlineDb';
import { quizzesApi, ApiError } from '../lib/api';

interface StorageInfo {
  lessonsCount: number;
  queuedAttempts: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({ lessonsCount: 0, queuedAttempts: 0 });

  const refreshStorageInfo = useCallback(async () => {
    try {
      const info = await getStorageInfo();
      setStorageInfo(info);
    } catch {
      // IndexedDB not available in SSR/some environments
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      const pending = await getUnsyncedAttempts();
      if (pending.length === 0) return;

      let synced = 0;
      for (const attempt of pending) {
        try {
          await quizzesApi.submit(attempt.quizId, attempt.answers);
          await markAttemptSynced(attempt.id);
          synced++;
        } catch (err) {
          // Skip non-network errors (quiz may no longer exist)
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
            await markAttemptSynced(attempt.id);
          }
        }
      }
      if (synced > 0) {
        await clearSyncedAttempts();
        setLastSyncedAt(new Date());
      }
    } finally {
      setSyncing(false);
      await refreshStorageInfo();
    }
  }, [syncing, refreshStorageInfo]);

  useEffect(() => {
    refreshStorageInfo();
  }, [refreshStorageInfo]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      setTimeout(syncQueue, 1000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue]);

  // Periodic sync every 5 minutes when online
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) syncQueue();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [syncQueue]);

  return { isOnline, syncing, lastSyncedAt, storageInfo, syncQueue, refreshStorageInfo };
}
