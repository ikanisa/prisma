
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isNetworkError ? 'Connection Error' : 'Something went wrong'}
            </h2>
            <p className="text-gray-600 mb-4">
              {isNetworkError 
                ? 'Please check your internet connection and try again.'
                : 'An unexpected error occurred. Please try refreshing the page.'
              }
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="text-left text-sm text-gray-500 bg-gray-50 p-2 rounded mt-2">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
              </details>
            )}
          </div>
          
          <Button 
            onClick={resetError}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorFallback;
