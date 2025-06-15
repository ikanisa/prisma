
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import HomeScreen from "./components/HomeScreen";
import PayScreen from "./components/PayScreen";
import GetPaidScreen from "./components/GetPaidScreen";
import QRPreviewScreen from "./components/QRPreviewScreen";
import SharedPaymentPage from "./components/SharedPaymentPage";
import TestDashboard from "./components/TestDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
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
            <Route path="/test" element={<TestDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
