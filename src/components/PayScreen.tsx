
import React from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleQRScanner from "./PayScreen/SimpleQRScanner";
import OfflineBanner from "./OfflineBanner";

const PayScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 w-full h-full z-50 bg-black overflow-hidden">
      <OfflineBanner />
      <SimpleQRScanner onBack={() => navigate(-1)} />
    </div>
  );
};

export default PayScreen;
