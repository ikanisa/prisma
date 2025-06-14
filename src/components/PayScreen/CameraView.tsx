
import React from 'react';
import QRScannerFrame from './QRScannerFrame';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

const CameraView: React.FC<CameraViewProps> = ({ videoRef }) => {
  return (
    <div className="absolute inset-0 w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
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
