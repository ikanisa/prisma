import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Businesses from "./pages/admin/Businesses";
import BusinessDetail from "./pages/admin/BusinessDetail";
import Drivers from "./pages/admin/Drivers";
import Products from "./pages/admin/Products";
import Orders from "./pages/admin/Orders";
import Payments from "./pages/admin/Payments";
import Events from "./pages/admin/Events";
import EdgeLogs from "./pages/admin/EdgeLogs";
import Agents from "./pages/admin/Agents";
import Personas from "./pages/admin/Personas";
import PersonaDetail from "./pages/admin/PersonaDetail";
import Tasks from "./pages/admin/Tasks";
import LearningModules from "./pages/admin/LearningModules";
import Documents from "./pages/admin/Documents";
import AgentLogs from "./pages/admin/AgentLogs";
import ModelRegistry from "./pages/admin/ModelRegistry";
import WhatsAppDashboard from "./pages/admin/WhatsAppDashboard";
import WhatsAppContacts from "./pages/admin/WhatsAppContacts";
import Conversations from "./pages/admin/Conversations";
import Farmers from "./pages/admin/Farmers";
import Passengers from "./pages/admin/Passengers";
import Rides from "./pages/admin/Rides";
import WhatsAppTemplates from "./pages/admin/WhatsAppTemplates";
import RealtimeStressTesting from "./pages/admin/RealtimeStressTesting";
import PharmacyOrders from "./pages/admin/PharmacyOrders";
import PharmacyShoppers from "./pages/admin/PharmacyShoppers";
import PharmacyProducts from "./pages/admin/PharmacyProducts";
import PharmacyLoadTest from "./pages/admin/PharmacyLoadTest";
import HardwareDashboard from "./pages/admin/HardwareDashboard";
import ProductDrafts from "./pages/admin/ProductDrafts";
import ProduceDrafts from "./pages/admin/ProduceDrafts";
import ProduceListings from "./pages/admin/ProduceListings";
import HardwareDeployment from "./pages/admin/HardwareDeployment";
import UnifiedOrders from "./pages/admin/UnifiedOrders";
import UnifiedProducts from "./pages/admin/UnifiedProducts";
import UnifiedConversations from "./pages/admin/UnifiedConversations";
import Properties from "./pages/admin/Properties";
import Vehicles from "./pages/admin/Vehicles";
import LiveHandoffs from "./pages/admin/LiveHandoffs";
import QualityDashboard from "./pages/admin/QualityDashboard";
import SystemMetrics from "./pages/admin/SystemMetrics";
import Settings from "./pages/admin/Settings";
import MarketingCampaigns from "./pages/admin/MarketingCampaigns";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="businesses" element={<Businesses />} />
          <Route path="businesses/:businessId" element={<BusinessDetail />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="farmers" element={<Farmers />} />
          <Route path="properties" element={<Properties />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="live-handoffs" element={<LiveHandoffs />} />
          <Route path="quality-dashboard" element={<QualityDashboard />} />
          <Route path="system-metrics" element={<SystemMetrics />} />
          <Route path="passengers" element={<Passengers />} />
          <Route path="rides" element={<Rides />} />
          <Route path="pharmacy/orders" element={<PharmacyOrders />} />
          <Route path="pharmacy/shoppers" element={<PharmacyShoppers />} />
          <Route path="pharmacy/products" element={<PharmacyProducts />} />
          <Route path="pharmacy/load-test" element={<PharmacyLoadTest />} />
          <Route path="whatsapp-templates" element={<WhatsAppTemplates />} />
          <Route path="stress-testing" element={<RealtimeStressTesting />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="payments" element={<Payments />} />
          <Route path="events" element={<Events />} />
          <Route path="agents" element={<Agents />} />
          <Route path="personas" element={<Personas />} />
          <Route path="personas/:id" element={<PersonaDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="learning" element={<LearningModules />} />
          <Route path="documents" element={<Documents />} />
          <Route path="agent-logs" element={<AgentLogs />} />
          <Route path="model-registry" element={<ModelRegistry />} />
          <Route path="whatsapp" element={<WhatsAppDashboard />} />
          <Route path="whatsapp-contacts" element={<WhatsAppContacts />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="help" element={<div className="p-6">Support Tickets page coming soon...</div>} />
          <Route path="settings" element={<Settings />} />
          <Route path="marketing-campaigns" element={<MarketingCampaigns />} />
          <Route path="edge-logs" element={<EdgeLogs />} />
          <Route path="hardware" element={<HardwareDashboard />} />
          <Route path="product-drafts" element={<ProductDrafts />} />
          <Route path="produce-drafts" element={<ProduceDrafts />} />
          <Route path="produce-listings" element={<ProduceListings />} />
          <Route path="hardware-deployment" element={<HardwareDeployment />} />
          <Route path="unified-orders" element={<UnifiedOrders />} />
          <Route path="unified-products" element={<UnifiedProducts />} />
          <Route path="unified-conversations" element={<UnifiedConversations />} />
        </Route>
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
