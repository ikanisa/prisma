
import React from 'react';
import { QrCode, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import PromoBanner from './PromoBanner';

const HomeScreen = () => {
  const navigate = useNavigate();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mobile Money PWA',
          text: 'Send & Receive Money. Instantly. Privately.',
          url: window.location.origin
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback for browsers without Web Share API
      navigator.clipboard.writeText(window.location.origin);
      toast({
        title: "Link Copied!",
        description: "App link copied to clipboard"
      });
    }
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/YOUR_CHANNEL_LINK', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 relative">
      {/* Promo Banner */}
      <PromoBanner />
      
      <div className="container mx-auto px-4 py-4 pt-16 h-screen overflow-hidden">
        <div className="flex flex-col items-center justify-center h-full space-y-6">
          
          {/* Hero Banner */}
          <div className="text-center animate-fade-slide">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Mobile Money</h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 font-semibold">Send & Receive Money.
Instant. Secure.</p>
          </div>

          {/* Main Action Buttons */}
          <div className="w-full max-w-md space-y-4">
            <button 
              onClick={() => navigate('/pay')} 
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold py-4 px-8 rounded-2xl min-h-[64px] text-button transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ripple flex items-center justify-center space-x-4"
            >
              <QrCode className="icon-large" />
              <span>Scan & Pay</span>
            </button>

            <button 
              onClick={() => navigate('/get-paid')} 
              className="w-full bg-gradient-to-r from-green-400 via-teal-500 to-blue-500 hover:from-green-500 hover:via-teal-600 hover:to-blue-600 text-white font-semibold py-4 px-8 rounded-2xl min-h-[64px] text-button transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ripple flex items-center justify-center space-x-4"
            >
              <Link className="icon-large" />
              <span>Request Payment</span>
            </button>
          </div>

          {/* Share Actions */}
          <div className="flex space-x-6">
            <button onClick={handleShare} className="glass-card p-4 hover:scale-110 transition-transform duration-200 bg-gradient-to-r from-blue-400/20 to-purple-400/20 hover:from-blue-400/30 hover:to-purple-400/30" title="Share this app">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>

            <button onClick={openWhatsApp} className="glass-card p-4 hover:scale-110 transition-transform duration-200 bg-gradient-to-r from-green-400/20 to-emerald-400/20 hover:from-green-400/30 hover:to-emerald-400/30" title="Join WhatsApp Channel">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
