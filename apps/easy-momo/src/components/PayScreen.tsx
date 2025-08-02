
import React from 'react';
import { useNavigate } from 'react-router-dom';
import UniversalQRScanner from "./PayScreen/UniversalQRScanner";
import OfflineBanner from "./OfflineBanner";

const PayScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 w-full h-full z-50 overflow-hidden">
      {/* Liquid glass background for scanner */}
      <div className="absolute inset-0 liquid-theme">
        <div className="liquid-bg opacity-30" />
      </div>
      
      <div className="relative z-10 h-full">
        <OfflineBanner />
        <UniversalQRScanner onBack={() => navigate('/')} />
      </div>
    </div>
  );
};

export default PayScreen;
