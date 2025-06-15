
import React from 'react';
import { QrCode, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import PromoBanner from './PromoBanner';
import OfflineBanner from './OfflineBanner';
import { t } from '@/i18n';
import LanguageToggle from './LanguageToggle';

// Dynamic Icon Loader for Lucide icons by name
const LucideIconDynamic = ({ name, ...props }: { name: string } & React.SVGProps<SVGSVGElement>) => {
  // This works for lucide-react v0.224.0+ and will fallback if not available
  const icons = require('lucide-react').icons || {};
  const LucideIcon = icons?.[name.charAt(0).toUpperCase() + name.slice(1)] || icons?.[name];
  if (LucideIcon) return <LucideIcon {...props} />;
  // fallback: blank or error SVG 
  return <svg width={32} height={32} {...props}><rect width="100%" height="100%" fill="#25d366"/><text x="50%" y="55%" textAnchor="middle" fontSize="10" fill="#fff">WA</text></svg>;
};

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
              {/* WhatsApp icon using dynamic loader */}
              <LucideIconDynamic name="Whatsapp" className="w-8 h-8 text-green-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomeScreen;

