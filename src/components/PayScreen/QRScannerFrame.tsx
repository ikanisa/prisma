
import React from 'react';

const QRScannerFrame: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative">
        {/* Much larger QR frame that extends closer to screen edges */}
        <div className="w-72 h-72 xs:w-80 xs:h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] lg:w-[32rem] lg:h-[32rem] border-4 border-white rounded-3xl qr-glow">
          {/* Corner indicators - larger and more prominent */}
          <div className="absolute -top-2 -left-2 w-12 h-12 sm:w-16 sm:h-16 border-l-8 border-t-8 border-blue-400 rounded-tl-3xl"></div>
          <div className="absolute -top-2 -right-2 w-12 h-12 sm:w-16 sm:h-16 border-r-8 border-t-8 border-blue-400 rounded-tr-3xl"></div>
          <div className="absolute -bottom-2 -left-2 w-12 h-12 sm:w-16 sm:h-16 border-l-8 border-b-8 border-blue-400 rounded-bl-3xl"></div>
          <div className="absolute -bottom-2 -right-2 w-12 h-12 sm:w-16 sm:h-16 border-r-8 border-b-8 border-blue-400 rounded-br-3xl"></div>
          
          {/* Scanning line animation */}
          <div className="absolute inset-4 rounded-2xl overflow-hidden">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"></div>
          </div>
        </div>
        
        {/* Instruction text - positioned below the larger frame */}
        <div className="absolute -bottom-16 sm:-bottom-20 left-1/2 transform -translate-x-1/2 px-4">
          <p className="text-white text-center text-lg sm:text-xl font-semibold whitespace-nowrap">
            Point camera at QR code
          </p>
          <p className="text-gray-300 text-center text-sm sm:text-base mt-2">
            Position the QR code within the frame
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRScannerFrame;
