import React from 'react';

interface OrderStatusModalProps {
  orderId: string;
  status: string;
}

export default function OrderStatusModal({ orderId, status }: OrderStatusModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="font-bold mb-2">Order {orderId}</h2>
        <p>Status: {status}</p>
      </div>
    </div>
  );
}
