import React from 'react';

interface QRGeneratorProps {
  url: string;
}

export default function QRGenerator({ url }: QRGeneratorProps) {
  // Placeholder for QR code generation
  return (
    <div className="p-4 border rounded">
      <p>Scan this code to pay:</p>
      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`} alt="QR Code" />
    </div>
  );
}
