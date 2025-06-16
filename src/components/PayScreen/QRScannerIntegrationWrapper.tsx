
import React, { useEffect, useState } from 'react';
import { qrScannerIntegrationTester, IntegrationTestResult } from '@/utils/qrScannerIntegration';
import { scannerPerformanceOptimizer } from '@/utils/scannerPerformanceOptimizer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Activity } from 'lucide-react';

interface QRScannerIntegrationWrapperProps {
  children: React.ReactNode;
  enableIntegrationTests?: boolean;
  enablePerformanceOptimization?: boolean;
}

const QRScannerIntegrationWrapper: React.FC<QRScannerIntegrationWrapperProps> = ({
  children,
  enableIntegrationTests = false,
  enablePerformanceOptimization = true
}) => {
  const [integrationResults, setIntegrationResults] = useState<IntegrationTestResult[]>([]);
  const [showIntegrationStatus, setShowIntegrationStatus] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    if (enablePerformanceOptimization) {
      optimizeScanner();
    }

    if (enableIntegrationTests) {
      runIntegrationTests();
    }

    return () => {
      scannerPerformanceOptimizer.stopMonitoring();
    };
  }, [enableIntegrationTests, enablePerformanceOptimization]);

  const optimizeScanner = async () => {
    setIsOptimizing(true);
    try {
      scannerPerformanceOptimizer.startMonitoring();
      scannerPerformanceOptimizer.optimizeForDevice();
    } catch (error) {
      console.error('Scanner optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const runIntegrationTests = async () => {
    try {
      const results = await qrScannerIntegrationTester.runFullIntegrationTest();
      setIntegrationResults(results);
      setShowIntegrationStatus(true);
    } catch (error) {
      console.error('Integration tests failed:', error);
    }
  };

  const getIntegrationStatus = () => {
    if (integrationResults.length === 0) return null;
    
    const summary = qrScannerIntegrationTester.getTestSummary();
    const allPassed = summary.failed === 0;
    
    return (
      <Alert className={`mb-4 ${allPassed ? 'border-green-500' : 'border-red-500'}`}>
        <div className="flex items-center">
          {allPassed ? (
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500 mr-2" />
          )}
          <AlertDescription>
            Integration Tests: {summary.passed}/{summary.total} passed
            {summary.failed > 0 && (
              <div className="mt-2">
                <strong>Failed components:</strong>
                <ul className="list-disc list-inside mt-1">
                  {integrationResults
                    .filter(r => !r.success)
                    .map((result, index) => (
                      <li key={index} className="text-sm">
                        {result.component}: {result.error}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </div>
      </Alert>
    );
  };

  if (enableIntegrationTests && showIntegrationStatus) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="p-4">
          {getIntegrationStatus()}
          
          {isOptimizing && (
            <Alert className="mb-4">
              <Activity className="w-4 h-4 mr-2 animate-spin" />
              <AlertDescription>
                Optimizing scanner performance for your device...
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowIntegrationStatus(false)}
              variant="outline"
              size="sm"
            >
              Continue to Scanner
            </Button>
            <Button
              onClick={runIntegrationTests}
              variant="outline"
              size="sm"
            >
              Re-run Tests
            </Button>
          </div>
        </div>
        
        {!showIntegrationStatus && children}
      </div>
    );
  }

  return <>{children}</>;
};

export default QRScannerIntegrationWrapper;
