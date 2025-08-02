
import React from 'react';
import ErrorRecoveryModal from '../ErrorRecoveryModal';

interface QRScannerErrorHandlerProps {
  showErrorModal: boolean;
  currentError: Error | null;
  retryCount: number;
  onRetry: () => void;
  onManualInput: () => void;
  onClose: () => void;
}

const QRScannerErrorHandler: React.FC<QRScannerErrorHandlerProps> = ({
  showErrorModal,
  currentError,
  retryCount,
  onRetry,
  onManualInput,
  onClose
}) => {
  if (!showErrorModal || !currentError) return null;

  return (
    <ErrorRecoveryModal
      error={currentError}
      onRetry={onRetry}
      onManualInput={onManualInput}
      onClose={onClose}
      isVisible={showErrorModal}
      retryCount={retryCount}
    />
  );
};

export default QRScannerErrorHandler;
