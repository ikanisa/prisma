import React from 'react';
import { QrCode, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import PromoBanner from './PromoBanner';
import OfflineBanner from './OfflineBanner';
import { t } from '@/i18n';
import LanguageToggle from './LanguageToggle';

const HomeScreen = () => {
  const navigate = useNavigate();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('home.welcomeTitle'),
          text: t('home.welcomeSubtitle'),
          url: window.location.origin
        });
      } catch (error) {
        console.log(t('generic.shareError'), error);
      }
    } else {
      navigator.clipboard.writeText(window.location.origin);
      toast({
        title: t("generic.copied"),
        description: t("generic.linkCopied")
      });
    }
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/YOUR_CHANNEL_LINK', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 relative">
      {/* Language Toggle */}
      <LanguageToggle />

      {/* Promo Banner */}
      <div className="animate-fade-in">
        <PromoBanner />
      </div>
      {/* Offline Banner */}
      <OfflineBanner />
      <div className="container mx-auto px-4 py-4 pt-16 h-screen overflow-hidden">
        <div className="flex flex-col items-center justify-center h-full space-y-6">
          {/* Hero Banner */}
          <div className="text-center animate-fade-slide">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              {t('home.welcomeTitle')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 font-semibold">
              {t('home.welcomeSubtitle')}
            </p>
          </div>
          {/* Main Action Buttons */}
          <div className="w-full max-w-md space-y-4">
            <button 
              onClick={() => navigate('/pay')} 
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold py-4 px-8 rounded-2xl min-h-[64px] text-button transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ripple flex items-center justify-center space-x-4"
            >
              <QrCode className="icon-large" />
              <span>Kwishyura</span>
            </button>
            <button 
              onClick={() => navigate('/get-paid')} 
              className="w-full bg-gradient-to-r from-green-400 via-teal-500 to-blue-500 hover:from-green-500 hover:via-teal-600 hover:to-blue-600 text-white font-semibold py-4 px-8 rounded-2xl min-h-[64px] text-button transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ripple flex items-center justify-center space-x-4"
            >
              <Link className="icon-large" />
              <span>{t('home.receive')}</span>
            </button>
          </div>
          {/* Share Actions */}
          <div className="flex space-x-6">
            <button onClick={handleShare} className="glass-card p-4 hover:scale-110 transition-transform duration-200 bg-gradient-to-r from-blue-400/20 to-purple-400/20 hover:from-blue-400/30 hover:to-purple-400/30">
              {/* Lucide share icon only */}
              {/* Not using user SVG, use allowed Lucide icon */}
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <g>
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <path d="M8.59 13.51l6.83 3.98"/>
                  <path d="M15.41 6.51l-6.82 3.98"/>
                </g>
              </svg>
            </button>
            <button onClick={openWhatsApp} className="glass-card p-4 hover:scale-110 transition-transform duration-200 bg-gradient-to-r from-green-400/20 to-emerald-400/20 hover:from-green-400/30 hover:to-emerald-400/30">
              {/* WhatsApp SVG icon only */}
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.001-2.154.643-4.297 1.688-5.952L.057 24zM22.727 8.977a.56.56 0 0 0-.415-.177H5.607a.561.561 0 0 0-.517.074l-.304.379c-.009.01-.019.017-.024.026l-.004.002-.002.003-.002.003-.001.002-.001.002a.557.557 0 0 0-.078.074l-.179.223c-.037.046-.07.096-.1-.149l-.003-.003a.554.554 0 0 0-.013-.006.563.563 0 0 0-.008-.004.557.557 0 0 0-.011-.005.553.553 0 0 0-.006-.003.556.556 0 0 0-.009-.005.554.554 0 0 0-.005-.002.56.56 0 0 0-.008-.004.557.557 0 0 0-.003-.001.558.558 0 0 0-.005-.003.555.555 0 0 0-.002-.001.561.561 0 0 0-.005-.002.555.555 0 0 0-.001 0H.56a.557.557 0 0 0-.509.274.558.558 0 0 0-.049.286l.004.015c.088 1.787.714 3.507 1.754 4.998l.001.001.002.002.002.002.001.001.002.002a.561.561 0 0 0 .08.081l.221.177c.047.037.097.07.15.099l.003.003a.554.554 0 0 0 .006.013.563.563 0 0 0 .004.008.557.557 0 0 0 .005.011.553.553 0 0 0 .003.006.556.556 0 0 0 .005.009.554.554 0 0 0 .002.005.56.56 0 0 0 .004.008.557.557 0 0 0 .001.003.558.558 0 0 0 .003.005.555.555 0 0 0 .001.002.561.561 0 0 0 .002.005h.001a11.85 11.85 0 0 0 8.059 8.059h.001a.561.561 0 0 0 .005.002.555.555 0 0 0 .002.001.558.558 0 0 0 .005.003.555.555 0 0 0 .001.002.561.561 0 0 0 .005.005.554.554 0 0 0 .002.005.56.56 0 0 0 .008.004.557.557 0 0 0 .003.001.558.558 0 0 0 .005.003.555.555 0 0 0 .002.001.561.561 0 0 0 .005.005.554.554 0 0 0 .003.003.563.563 0 0 0 .004.008.557.557 0 0 0 .006.011l.003.003c.03.047.063.08.099.117l.177.221a.561.561 0 0 0 .081.08l.002.002.002.002.001.001.002.002.001.001c1.491 1.04 3.211 1.667 4.998 1.754l.015.004a.558.558 0 0 0 .286-.049.557.557 0 0 0 .274-.509v-.048zm-3.895 8.562c-.469.096-.866.146-1.215.146-.348 0-.746-.05-1.215-.146l-.001-.001a.363.363 0 0 1-.243-.11l-.987-.814c-.185-.153-.332-.336-.448-.541l-.002-.004a.361.361 0 0 1-.03-.198v-.071c0-.097.027-.194.08-.278l.001-.001 1.327-1.095c.076-.063.135-.142.176-.232l.001-.002.047-.108.001-.002c.024-.056.037-.117.037-.178 0-.061-.013-.122-.037-.178l-.001-.002-.047-.108.001-.002c-.041-.09-.1-.169-.176-.232l-.001-.001-1.327-1.095c-.053-.084-.08-.181-.08-.278v-.071a.361.361 0 0 1 .03-.198l.002-.004.448-.541c.116-.205.263-.388.448-.541l.987-.814a.363.363 0 0 1 .243-.11h.001c.469-.096.866-.146 1.215-.146.348 0 .746.05 1.215.146l.001.001a.363.363 0 0 1 .243.11l.987.814c.185.153.332.336.448.541l.002.004a.361.361 0 0 1 .03.198v.071c0 .097-.027.194-.08.278l-.001.001-1.327 1.095c-.076.063-.135.142-.176.232l-.001.002-.047.108.001.002c-.024.056-.037.117-.037.178 0 .061.013.122.037.178l.001.002.047.108-.001.002c.041.09.1.169.176.232l.001.001 1.327 1.095c.053.084.08.181.08.278v.071a.361.361 0 0 1-.03.198l-.002.004-.448.541c-.116.205-.263.388-.448.541l-.987.814a.363.363 0 0 1-.243.11h-.001zm1.43-2.067c-.026-.06-.04-.125-.04-.192 0-.067.014-.132.04-.192l.753-.621c.044-.036.078-.082.1-.134l.001-.001.036-.078c.018-.042.027-.087.027-.133 0-.046-.009-.091-.027-.133l-.001-.001-.036-.078c-.022-.052-.056-.098-.1-.134l-.753-.621c-.026-.06-.04-.125-.04-.192 0-.067.014-.132.04-.192l.753-.621c.044-.036.078-.082.1-.134l.001-.001.036-.078c.018-.042.027-.087.027-.133 0-.046-.009-.091-.027-.133l-.001-.001-.036-.078c-.022-.052-.056-.098-.1-.134l-.753-.621c-.026-.06-.04-.125-.04-.192 0-.067.014-.132.04-.192l-.753.621c-.044.036-.078.082-.1.134l-.001.001-.036.078c-.018.042-.027.087-.027.133 0 .046.009.091.027.133l.001.001.036.078c.022.052.056.098.1.134l.753.621c.026.06.04.125.04.192 0 .067-.014.132-.04.192l-.753.621c-.044.036-.078.082-.1.134l-.001.001-.036.078c-.018.042-.027.087-.027.133 0 .046.009.091.027.133l.001.001.036.078c.022.052.056.098.1.134l.753.621c.026.06.04.125.04.192 0 .067-.014.132-.04.192l.753-.621c.044-.036.078-.082.1-.134l.001-.001.036-.078c.018-.042.027-.087.027-.133 0-.046-.009-.091-.027-.133l-.001-.001-.036-.078c-.022-.052-.056-.098-.1-.134l-.753-.621z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomeScreen;
