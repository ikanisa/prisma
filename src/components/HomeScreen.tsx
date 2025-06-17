
import React, { useEffect, useState } from 'react';
import { QrCode, Link, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import PromoBanner from './PromoBanner';
import OfflineBanner from './OfflineBanner';
import MobileShareSheet from './MobileShareSheet';
import { t } from '@/i18n';
import LanguageToggle from './LanguageToggle';

// Dynamic Icon Loader for Lucide icons by name
const LucideIconDynamic = ({
  name,
  ...props
}: {
  name: string;
} & React.SVGProps<SVGSVGElement>) => {
  // This works for lucide-react v0.224.0+ and will fallback if not available
  const icons = require('lucide-react').icons || {};
  const LucideIcon = icons?.[name.charAt(0).toUpperCase() + name.slice(1)] || icons?.[name];
  if (LucideIcon) return <LucideIcon {...props} />;
  // fallback: blank or error SVG 
  return <svg width={32} height={32} {...props}><rect width="100%" height="100%" fill="#25d366" /><text x="50%" y="55%" textAnchor="middle" fontSize="10" fill="#fff">WA</text></svg>;
};

const PROMO_BANNER_HEIGHT = 136;
const PROMO_MINI_HEIGHT = 40;

function getBannerMinimized() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("promo_banner_minimized") === "true";
}

const HomeScreen = () => {
  const navigate = useNavigate();
  const [bannerMinimized, setBannerMinimized] = useState<boolean>(getBannerMinimized());
  const [showShareSheet, setShowShareSheet] = useState(false);
  
  useEffect(() => {
    function handleStorage() {
      setBannerMinimized(getBannerMinimized());
    }
    window.addEventListener("storage", handleStorage);
    const timer = setInterval(handleStorage, 400);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(timer);
    };
  }, []);

  const handleShare = async () => {
    // On mobile, show the share sheet for better UX
    if (window.innerWidth <= 768) {
      setShowShareSheet(true);
      return;
    }

    // Desktop fallback - use native share or clipboard
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("home.welcomeTitle"),
          text: t("home.welcomeSubtitle"),
          url: window.location.origin
        });
      } catch (error) {
        console.log(t("generic.shareError"), error);
      }
    } else {
      navigator.clipboard.writeText(window.location.origin);
      toast({
        title: t("generic.copied"),
        description: t("generic.linkCopied")
      });
    }
  };

  const handleMobileShare = (method: string) => {
    const appUrl = window.location.origin;
    const shareText = `Check out easyMO - the easiest way to send and receive mobile money payments in Rwanda! 🇷🇼💰`;
    
    switch (method) {
      case 'whatsapp':
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${appUrl}`)}`;
        window.open(whatsappUrl, '_blank');
        break;
      case 'sms':
        const smsUrl = `sms:?body=${encodeURIComponent(`${shareText}\n\n${appUrl}`)}`;
        window.open(smsUrl, '_blank');
        break;
    }
    setShowShareSheet(false);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.origin);
    toast({
      title: t("generic.copied"),
      description: "App link copied to clipboard"
    });
    setShowShareSheet(false);
  };

  const openWhatsApp = () => {
    window.open("https://whatsapp.com/channel/0029VawjRH4EVccC71nJqv2H", "_blank");
  };

  const topSpacer = <div className="w-full" style={{
    height: bannerMinimized ? `calc(${PROMO_MINI_HEIGHT}px + 0.5rem)` : `calc(${PROMO_BANNER_HEIGHT}px + 0.5rem)`,
    minHeight: bannerMinimized ? "2rem" : "4rem"
  }} aria-hidden="true" />;

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-stretch">
      <div className="relative flex-1 flex flex-col min-h-screen">
        <LanguageToggle />
        <div className="animate-fade-in">
          <PromoBanner />
        </div>
        <OfflineBanner />
        {topSpacer}
        
        <div className="flex-1 flex flex-col justify-center items-center px-2 py-2 overflow-y-auto">
          <div className="liquid-glass-panel backdrop-blur-2xl shadow-2xl px-3 py-6 w-full max-w-sm mx-auto space-y-4 transition-all duration-500">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="text-center animate-fade-slide pt-2 pb-2">
                <h1 data-testid="app-title" className="md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 text-5xl leading-tight">
                  easyMO
                </h1>
                <p className="text-sm md:text-2xl text-white font-medium">
                  {t("home.welcomeSubtitle")}
                </p>
              </div>
              
              <div className="w-full space-y-3">
                <button 
                  onClick={() => navigate("/pay")} 
                  aria-label={t("home.pay")} 
                  className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-2xl min-h-[56px] text-base md:text-button transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ripple flex items-center justify-center space-x-3"
                >
                  <QrCode className="w-6 h-6" aria-hidden="true" focusable="false" />
                  <span>{t("home.pay")}</span>
                </button>
                
                <button 
                  onClick={() => navigate("/get-paid")} 
                  aria-label={t("home.receive")} 
                  className="w-full bg-gradient-to-r from-green-400 via-teal-500 to-blue-500 hover:from-green-500 hover:via-teal-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-2xl min-h-[56px] text-base md:text-button transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ripple flex items-center justify-center space-x-3"
                >
                  <Link className="w-6 h-6" aria-hidden="true" focusable="false" />
                  <span>{t("home.receive")}</span>
                </button>
              </div>
              
              <div className="flex space-x-4">
                <button 
                  onClick={handleShare} 
                  className="logo-glass p-3 hover:scale-110 transition-transform duration-2000" 
                  aria-label="Share EasyMOMO App"
                >
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <g>
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="M8.59 13.51l6.83 3.98" />
                      <path d="M15.41 6.51l-6.82 3.98" />
                    </g>
                  </svg>
                </button>
                
                <button 
                  onClick={openWhatsApp} 
                  className="logo-glass p-3 hover:scale-110 transition-transform duration-2000" 
                  aria-label={t("home.joinWhatsapp")}
                >
                  <svg className="w-6 h-6 text-green-600" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">
                    <g>
                      <circle cx="16" cy="16" r="16" fill="#25D366" />
                      <path d="M22.732 18.755c-.36-.18-2.13-1.05-2.46-1.172-.33-.12-.57-.18-.81.183-.24.36-.93 1.173-1.14 1.413-.21.24-.42.27-.78.09-.36-.18-1.515-.557-2.888-1.767-1.067-.954-1.788-2.136-1.998-2.49-.21-.36-.022-.555.158-.732.162-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.81-1.95-1.11-2.67-.294-.704-.6-.607-.81-.62-.21-.014-.45-.018-.69-.018-.24 0-.63.09-.96.45-.33.36-1.26 1.23-1.26 2.998s1.293 3.478 1.473 3.723c.18.24 2.547 3.866 6.183 4.965.867.243 1.543.39 2.07.497.87.175 1.665.151 2.293.092.7-.067 2.13-.87 2.432-1.71.273-.726.273-1.35.192-1.481-.082-.134-.294-.216-.654-.396z" fill="#fff" />
                    </g>
                  </svg>
                </button>
                
                <button 
                  onClick={() => navigate("/history")} 
                  className="logo-glass p-3 hover:scale-110 transition-transform duration-2000" 
                  aria-label="Payment History" 
                  title="View payment history"
                >
                  <Clock className="w-6 h-6 text-purple-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Share Sheet */}
      <MobileShareSheet
        isVisible={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        paymentData={{
          amount: '',
          phone: '',
          paymentLink: window.location.origin,
          ussdString: ''
        }}
        onShare={handleMobileShare}
        onCopy={handleCopyUrl}
        onDownload={() => {}} // Not applicable for app sharing
      />
    </div>
  );
};

export default HomeScreen;
