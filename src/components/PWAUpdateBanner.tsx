
import React from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { usePWAUpdates } from '@/hooks/usePWAUpdates';

const PWAUpdateBanner = () => {
  const { showUpdateBanner, isUpdating, applyUpdate, dismissUpdate } = usePWAUpdates();

  if (!showUpdateBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            {isUpdating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">
              {isUpdating ? 'Updating easyMO...' : 'New Version Available'}
            </h3>
            <p className="text-xs text-blue-100">
              {isUpdating 
                ? 'Please wait while we apply the update' 
                : 'Tap "Update" to get the latest features and improvements'
              }
            </p>
          </div>
        </div>
        
        {!isUpdating && (
          <div className="flex items-center gap-2">
            <Button
              onClick={applyUpdate}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs px-3 py-1 h-auto"
            >
              Update
            </Button>
            <button
              onClick={dismissUpdate}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Dismiss update notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PWAUpdateBanner;
