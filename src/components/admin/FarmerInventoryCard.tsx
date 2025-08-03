import React from 'react';

interface FarmerInventoryCardProps {
  name: string;
  quantity: string;
  price: string;
}

export default function FarmerInventoryCard({ name, quantity, price }: FarmerInventoryCardProps) {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <h2 className="font-semibold">{name}</h2>
      <p>{quantity}</p>
      <p className="text-sm text-gray-600">{price}</p>
    </div>
  );
}
