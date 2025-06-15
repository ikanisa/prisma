
import React, { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const PWAInstallBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  // Don't show if already installed, not installable, or dismissed
  if (isInstalled || !isInstallable || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    const success = await promptInstall();
    if (!success) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-40 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-2xl animate-slide-up">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install WavePay</h3>
            <p className="text-xs text-blue-100 leading-tight">
              Get faster access and work offline
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleInstall}
              size="sm"
              className="bg-white text-blue-600 hover:bg-blue-50 rounded-full px-4 py-2 text-xs font-semibold"
            >
              <Download className="w-3 h-3 mr-1" />
              Install
            </Button>
            
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 rounded-full p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAInstallBanner;
