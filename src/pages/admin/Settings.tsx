import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings as SettingsIcon, 
  Database, 
  MessageSquare, 
  DollarSign, 
  Bot,
  Globe,
  Shield,
  Bell,
  Mail,
  Key,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EdgeFunctionConfig {
  function_name: string;
  config_key: string;
  config_value: string;
}

interface SystemSettings {
  whatsappWebhookUrl: string;
  whatsappToken: string;
  momoApiUrl: string;
  momoSubscriptionKey: string;
  openaiApiKey: string;
  defaultCurrency: string;
  maxOrderValue: number;
  minCreditBalance: number;
  enableSmsNotifications: boolean;
  enablePushNotifications: boolean;
  autoApproveBusinesses: boolean;
  requireDriverVerification: boolean;
  maxDeliveryRadius: number;
  supportEmail: string;
  systemMaintenance: boolean;
}

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edgeFunctionConfigs, setEdgeFunctionConfigs] = useState<EdgeFunctionConfig[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    whatsappWebhookUrl: '',
    whatsappToken: '',
    momoApiUrl: '',
    momoSubscriptionKey: '',
    openaiApiKey: '',
    defaultCurrency: 'RWF',
    maxOrderValue: 1000000,
    minCreditBalance: 10,
    enableSmsNotifications: true,
    enablePushNotifications: true,
    autoApproveBusinesses: false,
    requireDriverVerification: true,
    maxDeliveryRadius: 50,
    supportEmail: 'support@easymo.rw',
    systemMaintenance: false
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      
      // Load edge function configurations
      const { data: configs, error } = await supabase
        .from('edge_function_config')
        .select('*')
        .order('function_name', { ascending: true });

      if (error) throw error;

      setEdgeFunctionConfigs(configs || []);

      // Load system settings from edge function configs
      const configMap = (configs || []).reduce((acc, config) => {
        acc[config.config_key] = config.config_value;
        return acc;
      }, {} as Record<string, string>);

      setSettings({
        whatsappWebhookUrl: configMap.whatsapp_webhook_url || '',
        whatsappToken: configMap.whatsapp_token || '',
        momoApiUrl: configMap.momo_api_url || '',
        momoSubscriptionKey: configMap.momo_subscription_key || '',
        openaiApiKey: configMap.openai_api_key || '',
        defaultCurrency: configMap.default_currency || 'RWF',
        maxOrderValue: parseInt(configMap.max_order_value) || 1000000,
        minCreditBalance: parseInt(configMap.min_credit_balance) || 10,
        enableSmsNotifications: configMap.enable_sms_notifications === 'true',
        enablePushNotifications: configMap.enable_push_notifications === 'true',
        autoApproveBusinesses: configMap.auto_approve_businesses === 'true',
        requireDriverVerification: configMap.require_driver_verification === 'true',
        maxDeliveryRadius: parseInt(configMap.max_delivery_radius) || 50,
        supportEmail: configMap.support_email || 'support@easymo.rw',
        systemMaintenance: configMap.system_maintenance === 'true'
      });

    } catch (error) {
      console.error('Error loading configurations:', error);
      toast({
        title: "Error",
        description: "Failed to load system configurations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async (section: string) => {
    try {
      setSaving(true);

      const configUpdates: { function_name: string; config_key: string; config_value: string }[] = [];

      if (section === 'integrations') {
        configUpdates.push(
          { function_name: 'global', config_key: 'whatsapp_webhook_url', config_value: settings.whatsappWebhookUrl },
          { function_name: 'global', config_key: 'whatsapp_token', config_value: settings.whatsappToken },
          { function_name: 'global', config_key: 'momo_api_url', config_value: settings.momoApiUrl },
          { function_name: 'global', config_key: 'momo_subscription_key', config_value: settings.momoSubscriptionKey },
          { function_name: 'global', config_key: 'openai_api_key', config_value: settings.openaiApiKey }
        );
      } else if (section === 'business') {
        configUpdates.push(
          { function_name: 'global', config_key: 'default_currency', config_value: settings.defaultCurrency },
          { function_name: 'global', config_key: 'max_order_value', config_value: settings.maxOrderValue.toString() },
          { function_name: 'global', config_key: 'min_credit_balance', config_value: settings.minCreditBalance.toString() },
          { function_name: 'global', config_key: 'auto_approve_businesses', config_value: settings.autoApproveBusinesses.toString() },
          { function_name: 'global', config_key: 'require_driver_verification', config_value: settings.requireDriverVerification.toString() },
          { function_name: 'global', config_key: 'max_delivery_radius', config_value: settings.maxDeliveryRadius.toString() }
        );
      } else if (section === 'notifications') {
        configUpdates.push(
          { function_name: 'global', config_key: 'enable_sms_notifications', config_value: settings.enableSmsNotifications.toString() },
          { function_name: 'global', config_key: 'enable_push_notifications', config_value: settings.enablePushNotifications.toString() },
          { function_name: 'global', config_key: 'support_email', config_value: settings.supportEmail }
        );
      } else if (section === 'system') {
        configUpdates.push(
          { function_name: 'global', config_key: 'system_maintenance', config_value: settings.systemMaintenance.toString() }
        );
      }

      // Update configurations
      for (const config of configUpdates) {
        const { error } = await supabase
          .from('edge_function_config')
          .upsert({
            function_name: config.function_name,
            config_key: config.config_key,
            config_value: config.config_value
          }, {
            onConflict: 'function_name,config_key'
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `${section} settings saved successfully`,
      });

      await loadConfigurations();

    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const testWhatsAppConnection = async () => {
    try {
      const response = await supabase.functions.invoke('test-whatsapp-connection', {
        body: { webhook_url: settings.whatsappWebhookUrl, token: settings.whatsappToken }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "WhatsApp connection test successful",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "WhatsApp connection test failed",
        variant: "destructive"
      });
    }
  };

  const testMoMoConnection = async () => {
    try {
      const response = await supabase.functions.invoke('test-momo-connection', {
        body: { api_url: settings.momoApiUrl, subscription_key: settings.momoSubscriptionKey }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "MoMo API connection test successful",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "MoMo API connection test failed",
        variant: "destructive"
      });
    }
  };

  const maskSecret = (secret: string) => {
    if (!secret || secret.length < 8) return secret;
    return secret.substring(0, 4) + '*'.repeat(secret.length - 8) + secret.substring(secret.length - 4);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span>Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system parameters, integrations, and business rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadConfigurations} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowSecrets(!showSecrets)} 
            variant="outline" 
            size="sm"
          >
            {showSecrets ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showSecrets ? 'Hide' : 'Show'} Secrets
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      {settings.systemMaintenance && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            System is currently in maintenance mode. New user registrations and some features may be disabled.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="business">Business Rules</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* WhatsApp Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  WhatsApp Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-webhook">Webhook URL</Label>
                  <Input
                    id="whatsapp-webhook"
                    value={settings.whatsappWebhookUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsappWebhookUrl: e.target.value }))}
                    placeholder="https://your-webhook-url.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-token">Access Token</Label>
                  <Input
                    id="whatsapp-token"
                    type={showSecrets ? "text" : "password"}
                    value={showSecrets ? settings.whatsappToken : maskSecret(settings.whatsappToken)}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsappToken: e.target.value }))}
                    placeholder="Enter WhatsApp access token"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => saveConfiguration('integrations')} 
                    disabled={saving}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button 
                    onClick={testWhatsAppConnection} 
                    variant="outline"
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* MoMo Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  MoMo Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="momo-api">API URL</Label>
                  <Input
                    id="momo-api"
                    value={settings.momoApiUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, momoApiUrl: e.target.value }))}
                    placeholder="https://momo-api-url.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="momo-key">Subscription Key</Label>
                  <Input
                    id="momo-key"
                    type={showSecrets ? "text" : "password"}
                    value={showSecrets ? settings.momoSubscriptionKey : maskSecret(settings.momoSubscriptionKey)}
                    onChange={(e) => setSettings(prev => ({ ...prev, momoSubscriptionKey: e.target.value }))}
                    placeholder="Enter MoMo subscription key"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => saveConfiguration('integrations')} 
                    disabled={saving}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button 
                    onClick={testMoMoConnection} 
                    variant="outline"
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* OpenAI Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  OpenAI Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">API Key</Label>
                  <Input
                    id="openai-key"
                    type={showSecrets ? "text" : "password"}
                    value={showSecrets ? settings.openaiApiKey : maskSecret(settings.openaiApiKey)}
                    onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                    placeholder="sk-..."
                  />
                </div>
                <Button 
                  onClick={() => saveConfiguration('integrations')} 
                  disabled={saving}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business Rules Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Business Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Input
                    id="currency"
                    value={settings.defaultCurrency}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                    placeholder="RWF"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-order">Max Order Value</Label>
                  <Input
                    id="max-order"
                    type="number"
                    value={settings.maxOrderValue}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxOrderValue: parseInt(e.target.value) || 0 }))}
                    placeholder="1000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-credit">Min Credit Balance</Label>
                  <Input
                    id="min-credit"
                    type="number"
                    value={settings.minCreditBalance}
                    onChange={(e) => setSettings(prev => ({ ...prev, minCreditBalance: parseInt(e.target.value) || 0 }))}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-radius">Max Delivery Radius (km)</Label>
                  <Input
                    id="delivery-radius"
                    type="number"
                    value={settings.maxDeliveryRadius}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxDeliveryRadius: parseInt(e.target.value) || 0 }))}
                    placeholder="50"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-approve Businesses</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically approve new business registrations
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoApproveBusinesses}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoApproveBusinesses: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Driver Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Require manual verification for new drivers
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireDriverVerification}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireDriverVerification: checked }))}
                  />
                </div>
              </div>

              <Button 
                onClick={() => saveConfiguration('business')} 
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Business Rules
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                  placeholder="support@easymo.rw"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send SMS notifications for critical events
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableSmsNotifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableSmsNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send push notifications to mobile devices
                    </p>
                  </div>
                  <Switch
                    checked={settings.enablePushNotifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enablePushNotifications: checked }))}
                  />
                </div>
              </div>

              <Button 
                onClick={() => saveConfiguration('notifications')} 
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable maintenance mode to disable new registrations
                  </p>
                </div>
                <Switch
                  checked={settings.systemMaintenance}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, systemMaintenance: checked }))}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Edge Function Status</h3>
                <div className="grid gap-4">
                  {[
                    'whatsapp-webhook', 'mcp-orchestrator', 'payment-handler', 
                    'driver-assignment', 'order-processing', 'notification-sender'
                  ].map((functionName) => (
                    <div key={functionName} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{functionName}</p>
                        <p className="text-sm text-muted-foreground">Edge function status</p>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => saveConfiguration('system')} 
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save System Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}