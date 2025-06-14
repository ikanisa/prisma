
import React from 'react';
import QRScannerFrame from './QRScannerFrame';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

const CameraView: React.FC<CameraViewProps> = ({ videoRef }) => {
  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Placeholder camera background with gradient */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900">
        {/* Subtle pattern overlay to simulate camera view */}
        <div className="absolute inset-0 opacity-20"
             style={{
               backgroundImage: `repeating-linear-gradient(
                 45deg,
                 transparent,
                 transparent 2px,
                 rgba(255,255,255,0.1) 2px,
                 rgba(255,255,255,0.1) 4px
               )`
             }}>
        </div>
        
        {/* Demo text overlay */}
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="bg-black/50 rounded-lg px-4 py-2 text-white text-sm">
            📷 Demo Camera View
          </div>
        </div>
      </div>
      
      {/* Hidden video element for compatibility */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />
      
      <QRScannerFrame />
      
      {/* Semi-transparent overlay to highlight the scanning area */}
      <div className="absolute inset-0 bg-black/40">
        {/* Cut out the center scanning area */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-72 h-72 xs:w-80 xs:h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] lg:w-[32rem] lg:h-[32rem] rounded-3xl"
               style={{
                 boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
               }}>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraView;
