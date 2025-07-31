import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, MessageSquare, Users, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface StatsData {
  totalTemplates: number;
  activeTemplates: number;
  totalMessages: number;
  messagesThisMonth: number;
  uniqueRecipients: number;
  averageResponseTime: number;
  successRate: number;
  openRate: number;
}

export function CampaignStats() {
  const [stats, setStats] = useState<StatsData>({
    totalTemplates: 0,
    activeTemplates: 0,
    totalMessages: 0,
    messagesThisMonth: 0,
    uniqueRecipients: 0,
    averageResponseTime: 0,
    successRate: 0,
    openRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch template stats
      const { data: templates, error: templatesError } = await supabase
        .from('whatsapp_templates')
        .select('status');

      if (templatesError) throw templatesError;

      // Fetch message stats
      const { data: messages, error: messagesError } = await supabase
        .from('campaign_messages')
        .select('status, sent_at, delivered_at, responded_at');

      if (messagesError) throw messagesError;

      // Fetch contact stats
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('phone_number, last_interaction');

      if (contactsError) throw contactsError;

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const totalTemplates = templates?.length || 0;
      const activeTemplates = templates?.filter(t => t.status === 'active').length || 0;
      
      const totalMessages = messages?.length || 0;
      const messagesThisMonth = messages?.filter(m => {
        if (!m.sent_at) return false;
        const sentDate = new Date(m.sent_at);
        return sentDate.getMonth() === currentMonth && sentDate.getFullYear() === currentYear;
      }).length || 0;

      const uniqueRecipients = contacts?.length || 0;
      
      const deliveredMessages = messages?.filter(m => m.delivered_at) || [];
      const respondedMessages = messages?.filter(m => m.responded_at) || [];
      
      const successRate = totalMessages > 0 ? (deliveredMessages.length / totalMessages) * 100 : 0;
      const openRate = deliveredMessages.length > 0 ? (respondedMessages.length / deliveredMessages.length) * 100 : 0;

      // Calculate average response time (simplified)
      const responseTimes = respondedMessages
        .filter(m => m.delivered_at && m.responded_at)
        .map(m => {
          const delivered = new Date(m.delivered_at!).getTime();
          const responded = new Date(m.responded_at!).getTime();
          return (responded - delivered) / (1000 * 60); // minutes
        });
      
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      setStats({
        totalTemplates,
        activeTemplates,
        totalMessages,
        messagesThisMonth,
        uniqueRecipients,
        averageResponseTime: Math.round(averageResponseTime),
        successRate: Math.round(successRate * 10) / 10,
        openRate: Math.round(openRate * 10) / 10
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Templates",
      value: stats.totalTemplates.toString(),
      description: `${stats.activeTemplates} active`,
      icon: MessageSquare,
      color: "text-blue-600"
    },
    {
      title: "Messages Sent",
      value: stats.totalMessages.toLocaleString(),
      description: `${stats.messagesThisMonth} this month`,
      icon: BarChart3,
      color: "text-green-600"
    },
    {
      title: "Unique Recipients",
      value: stats.uniqueRecipients.toLocaleString(),
      description: "Active contacts",
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Success Rate",
      value: `${stats.successRate}%`,
      description: "Messages delivered",
      icon: CheckCircle,
      color: "text-emerald-600"
    },
    {
      title: "Response Rate",
      value: `${stats.openRate}%`,
      description: "User engagement",
      icon: TrendingUp,
      color: "text-orange-600"
    },
    {
      title: "Avg Response Time",
      value: `${stats.averageResponseTime}m`,
      description: "User response time",
      icon: Clock,
      color: "text-indigo-600"
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
              <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/3 mb-2 animate-pulse"></div>
              <div className="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <IconComponent className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}