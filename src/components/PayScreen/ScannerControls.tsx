
import React from 'react';
import FlashlightButton from './FlashlightButton';
import ScannerBackButton from './ScannerBackButton';

interface ScannerControlsProps {
  showFlash: boolean;
  flashEnabled: boolean;
  onFlashToggle: (enabled: boolean) => void;
  onBack: () => void;
}

const ScannerControls: React.FC<ScannerControlsProps> = ({
  showFlash,
  flashEnabled,
  onFlashToggle,
  onBack
}) => {
  return (
    <>
      {showFlash && (
        <FlashlightButton 
          showFlashButton={showFlash} 
          flashEnabled={flashEnabled} 
          videoRef={React.useRef(null)} 
          onFlashToggle={onFlashToggle} 
        />
      )}
      <ScannerBackButton onBack={onBack} />
    </>
  );
};

export default ScannerControls;
