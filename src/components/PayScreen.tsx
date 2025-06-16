
import React, { useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRScanner from "./PayScreen/QRScanner";
import OfflineBanner from "./OfflineBanner";

const PayScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 w-full h-full z-50 bg-black overflow-hidden">
      <OfflineBanner />
      <QRScanner onBack={() => navigate(-1)} />
    </div>
  );
};

export default PayScreen;
