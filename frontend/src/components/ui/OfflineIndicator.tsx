import React from 'react';
import { WifiOff, Wifi, RefreshCw, HardDrive } from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

const OfflineIndicator: React.FC = () => {
  const { isOnline, syncing, storageInfo, syncQueue } = useOfflineSync();

  if (isOnline && storageInfo.queuedAttempts === 0) return null;

  return (
    <div
      className={`fixed bottom-20 left-4 z-40 px-3 py-2 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 max-w-xs ${
        isOnline ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {syncing ? 'Syncing…' : `${storageInfo.queuedAttempts} attempt${storageInfo.queuedAttempts !== 1 ? 's' : ''} to sync`}
          </span>
          <button
            onClick={syncQueue}
            disabled={syncing}
            className="ml-1 p-0.5 rounded hover:bg-blue-500 disabled:opacity-50"
            title="Sync now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <div>
            <div>Offline mode</div>
            {storageInfo.lessonsCount > 0 && (
              <div className="opacity-80 flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {storageInfo.lessonsCount} lesson{storageInfo.lessonsCount !== 1 ? 's' : ''} available
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;
