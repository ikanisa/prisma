
import React from 'react';

interface ScannerCornersProps {
  cornerColor: string;
  performanceConfig?: {
    enableShadows: boolean;
    enableAnimations: boolean;
  };
}

const ScannerCorners: React.FC<ScannerCornersProps> = ({
  cornerColor,
  performanceConfig
}) => {
  const shadowClass = performanceConfig?.enableShadows 
    ? 'shadow-[0_0_8px_2px_rgba(57,106,252,0.4)]' 
    : '';
  
  const transitionClass = performanceConfig?.enableAnimations 
    ? 'transition-all duration-300' 
    : '';

  return (
    <>
      <div className={`absolute -top-3 -left-3 w-14 h-14 border-l-8 border-t-8 ${cornerColor} rounded-tl-[2.4rem] ${shadowClass} ${transitionClass}`} />
      <div className={`absolute -top-3 -right-3 w-14 h-14 border-r-8 border-t-8 ${cornerColor} rounded-tr-[2.4rem] ${shadowClass} ${transitionClass}`} />
      <div className={`absolute -bottom-3 -left-3 w-14 h-14 border-l-8 border-b-8 ${cornerColor} rounded-bl-[2.4rem] ${shadowClass} ${transitionClass}`} />
      <div className={`absolute -bottom-3 -right-3 w-14 h-14 border-r-8 border-b-8 ${cornerColor} rounded-br-[2.4rem] ${shadowClass} ${transitionClass}`} />
    </>
  );
};

export default ScannerCorners;
