
import React, { useEffect, useState } from 'react';
import { Clock, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { paymentRequestService, PaymentRequest } from '@/services/paymentRequestService';
import USSDDialButton from './USSDDialButton';
import { formatDistanceToNow } from 'date-fns';

const PaymentRequestHistory: React.FC = () => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentRequests();
  }, []);

  const loadPaymentRequests = async () => {
    try {
      const data = await paymentRequestService.getPaymentRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load payment requests:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Payment Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Payment Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No payment requests yet. Create your first QR code above!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Payment Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {requests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{request.momo_number}</p>
                  <p className="text-lg font-bold text-green-600">
                    {request.amount.toLocaleString()} RWF
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              <USSDDialButton 
                ussdCode={request.ussd_code} 
                size="sm"
                showCopy={true}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentRequestHistory;
