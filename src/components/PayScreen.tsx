
import React from 'react';
import { useNavigate } from 'react-router-dom';
import UniversalQRScanner from "./PayScreen/UniversalQRScanner";
import OfflineBanner from "./OfflineBanner";

const PayScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 w-full h-full z-50 bg-black overflow-hidden">
      <OfflineBanner />
      <UniversalQRScanner onBack={() => navigate('/')} />
    </div>
  );
};

export default PayScreen;
