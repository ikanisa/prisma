
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import HomeScreen from "./components/HomeScreen";
import PayScreen from "./components/PayScreen";
import GetPaidScreen from "./components/GetPaidScreen";
import QRPreviewScreen from "./components/QRPreviewScreen";
import SharedPaymentPage from "./components/SharedPaymentPage";
import PaymentHistory from "./components/PaymentHistory";
import TestDashboard from "./components/TestDashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Verified from "./pages/Verified";
import PWAUpdateBanner from "./components/PWAUpdateBanner";
import { analyticsService } from "./services/analyticsService";
import "./services/errorMonitoringService"; // Initialize error monitoring

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  useEffect(() => {
    try {
      // Track app initialization
      analyticsService.trackEvent('app_initialized', {
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`
      });

      // Track page views on route changes
      const trackPageView = () => {
        analyticsService.trackPageView(window.location.pathname);
      };

      // Initial page view
      trackPageView();

      // Listen for route changes
      window.addEventListener('popstate', trackPageView);
      
      // Remove splash screen once app is loaded
      const handleAppLoad = () => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
          splash.style.opacity = '0';
          splash.style.transition = 'opacity 0.5s ease';
          setTimeout(() => splash.remove(), 500);
        }
      };

      // Remove splash after a short delay to ensure smooth transition
      setTimeout(handleAppLoad, 1000);
      
      return () => {
        window.removeEventListener('popstate', trackPageView);
      };
    } catch (error) {
      console.error('App initialization error:', error);
    }
  }, []);

  return (
    <div className="liquid-theme">
      <div className="liquid-bg" />
      <div className="liquid-content">
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <PWAUpdateBanner />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<HomeScreen />} />
                  <Route path="/pay" element={<PayScreen />} />
                  <Route path="/get-paid" element={<GetPaidScreen />} />
                  <Route path="/qr-preview" element={<QRPreviewScreen />} />
                  <Route path="/shared/:linkToken" element={<SharedPaymentPage />} />
                  <Route path="/history" element={<PaymentHistory />} />
                  <Route path="/test" element={<TestDashboard />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/verified" element={<Verified />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default App;
