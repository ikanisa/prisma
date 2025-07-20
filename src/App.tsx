import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import UsersContacts from "./pages/admin/UsersContacts";
import Businesses from "./pages/admin/Businesses";
import ListingsInventory from "./pages/admin/ListingsInventory";
import OrdersPayments from "./pages/admin/OrdersPayments";
import TripsIntents from "./pages/admin/TripsIntents";
import MessagingCampaigns from "./pages/admin/MessagingCampaigns";
import AIAgentsModels from "./pages/admin/AIAgentsModels";
import SystemOps from "./pages/admin/SystemOps";
import BusinessDetail from "./pages/admin/BusinessDetail";
import AdminAuth from "./pages/AdminAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/setup" element={<AdminAuth />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users-contacts" element={<UsersContacts />} />
          <Route path="businesses" element={<Businesses />} />
          <Route path="listings-inventory" element={<ListingsInventory />} />
          <Route path="orders-payments" element={<OrdersPayments />} />
          <Route path="trips-intents" element={<TripsIntents />} />
          <Route path="messaging-campaigns" element={<MessagingCampaigns />} />
          <Route path="ai-agents-models" element={<AIAgentsModels />} />
          <Route path="system-ops" element={<SystemOps />} />
          <Route path="businesses/:businessId" element={<BusinessDetail />} />
        </Route>
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
