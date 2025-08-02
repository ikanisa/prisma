import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Database, Zap, Share2, QrCode } from 'lucide-react';
import { supabaseService, getSessionId } from '@/services/supabaseService';
import { toast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'running';
  message: string;
  duration?: number;
}

const TestDashboard = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Session ID Generation', status: 'pending', message: 'Not started' },
    { name: 'QR Code Generation', status: 'pending', message: 'Not started' },
    { name: 'Payment Link Creation', status: 'pending', message: 'Not started' },
    { name: 'QR Code Scanning', status: 'pending', message: 'Not started' },
    { name: 'Database Storage', status: 'pending', message: 'Not started' },
    { name: 'Recent Data Retrieval', status: 'pending', message: 'Not started' }
  ]);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const runTest = async (testIndex: number, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    updateTest(testIndex, { status: 'running', message: 'Running...' });
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTest(testIndex, { 
        status: 'success', 
        message: 'Passed', 
        duration 
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTest(testIndex, { 
        status: 'error', 
        message: error.message || 'Failed', 
        duration 
      });
    }
  };

  const runAllTests = async () => {
    console.log('[TEST DEBUG] Starting comprehensive test suite...');

    // Test 1: Session ID Generation
    await runTest(0, async () => {
      const sessionId = getSessionId();
      if (!sessionId || sessionId.length < 10) {
        throw new Error('Invalid session ID generated');
      }
      console.log('[TEST DEBUG] Session ID:', sessionId);
    });

    // Test 2: QR Code Generation
    await runTest(1, async () => {
      const result = await supabaseService.generateQRCode('0788123456', 1000);
      if (!result.qrCodeImage || !result.ussdString) {
        throw new Error('QR generation failed - missing data');
      }
      console.log('[TEST DEBUG] QR Generation result:', result);
    });

    // Test 3: Payment Link Creation
    await runTest(2, async () => {
      const result = await supabaseService.createPaymentLink('0788123456', 1000);
      if (!result.paymentLink || !result.linkToken) {
        throw new Error('Payment link creation failed');
      }
      console.log('[TEST DEBUG] Payment link result:', result);
    });

    // Test 4: QR Code Scanning (simulated)
    await runTest(3, async () => {
      const mockQRImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const result = await supabaseService.scanQRCodeImage(mockQRImage);
      if (!result.ussdString) {
        throw new Error('QR scanning failed - no USSD returned');
      }
      console.log('[TEST DEBUG] QR scan result:', result);
    });

    // Test 5: Database Storage Verification
    await runTest(4, async () => {
      const recentQRs = await supabaseService.getRecentQRCodes();
      const recentPayments = await supabaseService.getRecentPayments();
      
      if (!Array.isArray(recentQRs) || !Array.isArray(recentPayments)) {
        throw new Error('Database queries failed');
      }
      
      console.log('[TEST DEBUG] Recent QRs:', recentQRs.length);
      console.log('[TEST DEBUG] Recent Payments:', recentPayments.length);
    });

    // Test 6: Recent Data Retrieval
    await runTest(5, async () => {
      await supabaseService.logShareEvent('test_event');
      
      // Wait a moment for the log to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const events = await supabaseService.getRecentPayments();
      console.log('[TEST DEBUG] Event logging test completed');
    });

    toast({
      title: "Test Suite Completed!",
      description: "Check the results below and console for detailed logs",
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Test Dashboard</h1>
              <p className="text-gray-600">Comprehensive testing of all backend flows</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary px-4 py-2"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={runAllTests}
            className="btn-primary flex items-center justify-center space-x-2 py-4"
          >
            <Zap className="w-5 h-5" />
            <span>Run All Tests</span>
          </button>
          
          <button
            onClick={() => navigate('/get-paid')}
            className="btn-secondary flex items-center justify-center space-x-2 py-4"
          >
            <QrCode className="w-5 h-5" />
            <span>Test QR Generation</span>
          </button>
          
          <button
            onClick={() => navigate('/pay')}
            className="btn-secondary flex items-center justify-center space-x-2 py-4"
          >
            <Share2 className="w-5 h-5" />
            <span>Test QR Scanning</span>
          </button>
        </div>

        {/* Test Results */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <Database className="w-6 h-6" />
            <span>Test Results</span>
          </h2>
          
          <div className="space-y-3">
            {tests.map((test, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border transition-all duration-200 ${getStatusColor(test.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <h3 className="font-semibold text-gray-800">{test.name}</h3>
                      <p className="text-sm text-gray-600">{test.message}</p>
                    </div>
                  </div>
                  {test.duration && (
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                      {test.duration}ms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="glass-card p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Testing Instructions</h2>
          <div className="space-y-3 text-gray-700">
            <p><strong>1. Run All Tests:</strong> Click the "Run All Tests" button to verify all backend functions</p>
            <p><strong>2. Manual Testing:</strong> Use the "Test QR Generation" and "Test QR Scanning" buttons</p>
            <p><strong>3. Check Console:</strong> Open browser dev tools to see detailed debug logs</p>
            <p><strong>4. Verify Data:</strong> Check your Supabase dashboard to see stored data</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestDashboard;
