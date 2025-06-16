
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const Verified = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home after 3 seconds
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="liquid-theme">
      <div className="liquid-bg" />
      <div className="liquid-content">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="liquid-glass-panel p-8 max-w-md mx-auto text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="loader-text text-2xl mb-4">
              Email Verified!
            </h1>
            <p className="loader-subtitle text-base mb-6">
              Your email has been successfully verified. You will be redirected to the home page shortly.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-green-400 via-teal-500 to-blue-500 hover:from-green-500 hover:via-teal-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-2xl transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            >
              Continue to App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verified;
