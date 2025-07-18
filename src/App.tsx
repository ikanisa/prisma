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
import Learning from "./pages/admin/Learning";
import Documents from "./pages/admin/Documents";
import AgentLogs from "./pages/admin/AgentLogs";
import ModelRegistry from "./pages/admin/ModelRegistry";
import WhatsAppDashboard from "./pages/admin/WhatsAppDashboard";
import Farmers from "./pages/admin/Farmers";

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
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="payments" element={<Payments />} />
          <Route path="events" element={<Events />} />
          <Route path="agents" element={<Agents />} />
          <Route path="personas" element={<Personas />} />
          <Route path="personas/:id" element={<PersonaDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="learning" element={<Learning />} />
          <Route path="documents" element={<Documents />} />
          <Route path="agent-logs" element={<AgentLogs />} />
          <Route path="model-registry" element={<ModelRegistry />} />
          <Route path="whatsapp" element={<WhatsAppDashboard />} />
          <Route path="help" element={<div className="p-6">Support Tickets page coming soon...</div>} />
          <Route path="edge-logs" element={<EdgeLogs />} />
        </Route>
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
