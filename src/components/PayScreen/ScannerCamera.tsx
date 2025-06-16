
import React from 'react';

interface ScannerCameraProps {
  isActive: boolean;
}

const ScannerCamera: React.FC<ScannerCameraProps> = ({ isActive }) => {
  return (
    <div 
      id="reader" 
      className={`absolute inset-0 w-full h-full object-cover bg-black ${
        isActive ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300`}
    />
  );
};

export default ScannerCamera;
