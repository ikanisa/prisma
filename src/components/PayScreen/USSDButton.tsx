
import React from 'react';
import { formatUSSDForTel } from '@/utils/ussdHelper';

interface USSDButtonProps {
  scannedData: string;
  onLaunchUSSD: () => void;
}

const USSDButton: React.FC<USSDButtonProps> = ({
  scannedData,
  onLaunchUSSD
}) => {
  const telUri = formatUSSDForTel(scannedData);

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 to-transparent safe-area-bottom z-30">
      <div
        className="max-w-md mx-auto text-center relative overflow-hidden rounded-4xl"
        style={{
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.25)',
          border: '2px solid rgba(255,255,255,0.12)',
          background: 'linear-gradient(120deg, rgba(255,255,255,0.16) 40%, rgba(77,111,255,0.12) 100%)',
          backdropFilter: 'blur(32px) saturate(140%)',
        }}
      >
        {/* Liquid glass highlight */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <svg className="w-full h-full" width="100%" height="100%">
            <ellipse 
              cx="50%" cy="0%" rx="60%" ry="38%"
              fill="rgba(255,255,255,0.12)">
              <animate attributeName="cy" values="0%;70%;0%" dur="5s" repeatCount="indefinite" />
              <animate attributeName="rx" values="60%;68%;60%" dur="4.5s" repeatCount="indefinite" />
            </ellipse>
            <ellipse 
              cx="70%" cy="95%" rx="44%" ry="18%"
              fill="rgba(101,172,255,0.08)">
              <animate attributeName="rx" values="42%;50%;42%" dur="3.8s" repeatCount="indefinite" />
            </ellipse>
          </svg>
        </div>
        <div className="relative z-10 p-4 sm:p-6">
          <p className="text-white text-xs sm:text-sm mb-3 sm:mb-4 drop-shadow">Scanned Payment Code:</p>
          
          {/* USSD Display */}
          <div className="bg-gray-900 rounded-xl p-3 mb-4">
            <p className="text-white font-mono text-sm sm:text-base font-bold tracking-wider break-all">
              {scannedData}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <a
              href={telUri}
              className="w-full bg-electric-ocean text-white py-3 sm:py-4 px-4 sm:px-6 rounded-2xl sm:text-xl font-bold shadow-lg backdrop-blur-[2px] transition-all hover:scale-105 active:scale-100 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(90deg, #396afc 40%, #2948ff 100%)',
                boxShadow: '0 2px 12px 1px rgba(57,106,252,0.12)'
              }}
            >
              📞 Dial Now
            </a>
            
            <button
              onClick={onLaunchUSSD}
              className="w-full bg-gray-700 text-white py-2 px-4 rounded-xl text-sm font-medium transition-all hover:bg-gray-600"
            >
              Copy Code
            </button>
          </div>
          
          <p className="text-gray-200 text-xs sm:text-sm mt-2 sm:mt-3 drop-shadow">
            Tap "Dial Now" to open dialer or "Copy Code" to copy
          </p>
        </div>
      </div>
    </div>
  );
};

export default USSDButton;
