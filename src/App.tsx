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
    
    return () => {
      window.removeEventListener('popstate', trackPageView);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

// Add service worker registration after the existing App component
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service worker registered:', registration);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New content available, reload to update');
              // Could show update notification here
            }
          });
        }
      });
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  });
}

export default App;
