import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PassengerHome from "./pages/passenger/Home";
import { Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Businesses from "./pages/admin/Businesses";
import Drivers from "./pages/admin/Drivers";
import EdgeLogs from "./pages/admin/EdgeLogs";
import Agents from "./pages/admin/Agents";
import Personas from "./pages/admin/Personas";
import Tasks from "./pages/admin/Tasks";
import Learning from "./pages/admin/Learning";
import Documents from "./pages/admin/Documents";
import AgentLogs from "./pages/admin/AgentLogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/passenger/home" element={<PassengerHome />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="businesses" element={<Businesses />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="products" element={<div className="p-6">Products page coming soon...</div>} />
          <Route path="orders" element={<div className="p-6">Orders page coming soon...</div>} />
          <Route path="payments" element={<div className="p-6">Payments page coming soon...</div>} />
          <Route path="events" element={<div className="p-6">Events page coming soon...</div>} />
          <Route path="agents" element={<Agents />} />
          <Route path="personas" element={<Personas />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="learning" element={<Learning />} />
          <Route path="documents" element={<Documents />} />
          <Route path="agent-logs" element={<AgentLogs />} />
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
