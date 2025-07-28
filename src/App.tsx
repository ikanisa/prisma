import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { AdminLayoutConsolidated } from "@/components/admin/AdminLayoutConsolidated";
import UnifiedDashboard from "./pages/admin/UnifiedDashboard";
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
import EnvSetup from "./pages/admin/EnvSetup";
import Agents from "./pages/admin/Agents";
import AgentDetail from "./pages/admin/AgentDetail";
import WebhookConfig from "./pages/admin/WebhookConfig";
// Agent detail pages
import AgentDetailLegacy from "./pages/admin/agents/AgentDetail";
import PersonaDetail from "./pages/admin/PersonaDetail";
import AgentLearning from "./pages/admin/agents/AgentLearning";
import TaskDetail from "./pages/admin/agents/TaskDetail";
// Conversation and campaign detail pages
import ConversationDetail from "./pages/admin/conversations/ConversationDetail";
import CampaignDetail from "./pages/admin/campaigns/CampaignDetail";
import CampaignCreate from "./pages/admin/campaigns/CampaignCreate";
import ConversationsInterface from "./pages/admin/ConversationsInterface";
import UnifiedListingsPage from "./pages/admin/UnifiedListingsPage";
import UnifiedOrdersPage from "./pages/admin/UnifiedOrdersPage";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { WhatsAppAgentTest } from "@/components/admin/WhatsAppAgentTest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ChatProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/auth" element={<AdminAuth />} />
        <Route path="/admin/setup" element={<AdminAuth />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayoutConsolidated />}>
          <Route index element={<UnifiedDashboard />} />
          <Route path="users-contacts" element={<UsersContacts />} />
          <Route path="businesses" element={<Businesses />} />
          <Route path="listings-inventory" element={<ListingsInventory />} />
          <Route path="unified-listings" element={<UnifiedListingsPage />} />
          <Route path="orders-payments" element={<OrdersPayments />} />
          <Route path="unified-orders" element={<UnifiedOrdersPage />} />
          <Route path="trips-intents" element={<TripsIntents />} />
          <Route path="messaging-campaigns" element={<MessagingCampaigns />} />
          <Route path="conversations" element={<ConversationsInterface />} />
          <Route path="ai-agents-models" element={<AIAgentsModels />} />
          <Route path="system-ops" element={<SystemOps />} />
          <Route path="env-setup" element={<EnvSetup />} />
          <Route path="webhook-config" element={<WebhookConfig />} />
          <Route path="whatsapp-test" element={<WhatsAppAgentTest />} />
          <Route path="whatsapp" element={<WhatsAppAgentTest />} />
          <Route path="agents" element={<Agents />} />
          <Route path="agents/:id" element={<AgentDetail />} />
          <Route path="businesses/:businessId" element={<BusinessDetail />} />
          
          {/* Agent detail routes */}
          <Route path="agents-legacy/:id" element={<AgentDetailLegacy />} />
          <Route path="agents/:agentId/personas/:id" element={<PersonaDetail />} />
          <Route path="agents/:id/learning" element={<AgentLearning />} />
          <Route path="agents/:agentId/tasks/:taskId" element={<TaskDetail />} />
          
          {/* Conversation and campaign detail routes */}
          <Route path="conversations/:id" element={<ConversationDetail />} />
          <Route path="campaigns/create" element={<CampaignCreate />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
        </Route>
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </BrowserRouter>
    </ChatProvider>
  </QueryClientProvider>
);

export default App;
