import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, QrCode, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WhatsAppIntegrationProps {
  onClose?: () => void;
}

export const WhatsAppIntegration: React.FC<WhatsAppIntegrationProps> = ({ onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your WhatsApp Business number",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsConnected(true);
      toast({
        title: "WhatsApp Connected!",
        description: "Your WhatsApp Business account is now ready for payments",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Please check your credentials and try again",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const features = [
    {
      icon: <MessageCircle className="h-5 w-5" />,
      title: "Smart Conversations",
      description: "AI understands payment intents automatically"
    },
    {
      icon: <QrCode className="h-5 w-5" />,
      title: "Instant QR Generation",
      description: "Generate payment QR codes directly in chat"
    },
    {
      icon: <ArrowRight className="h-5 w-5" />,
      title: "Button Templates",
      description: "Interactive buttons for seamless user experience"
    }
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <MessageCircle className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">WhatsApp Business Integration</h1>
        </div>
        <p className="text-muted-foreground">
          Enable intelligent payment conversations directly in WhatsApp
        </p>
      </div>

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect Your WhatsApp Business</CardTitle>
            <CardDescription>
              Enter your WhatsApp Business phone number to start receiving payment requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp Business Number</label>
              <Input
                type="tel"
                placeholder="+250781234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="text-lg"
              />
            </div>
            
            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? "Connecting..." : "Connect WhatsApp"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">WhatsApp Connected</h3>
                <p className="text-green-600">{phoneNumber}</p>
              </div>
              <Badge variant="secondary" className="ml-auto">Active</Badge>
            </div>
            
            <div className="space-y-3 text-sm text-green-700">
              <p>✅ Webhook configured and active</p>
              <p>✅ AI conversation flow enabled</p>
              <p>✅ QR code generation ready</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <h3 className="font-semibold text-lg">Features</h3>
        {features.map((feature, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {feature.icon}
              </div>
              <div>
                <h4 className="font-medium">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-blue-800 mb-2">How it works:</h4>
          <ol className="space-y-2 text-sm text-blue-700">
            <li>1. Customer messages your WhatsApp Business number</li>
            <li>2. AI detects payment intent (e.g., "get paid", "5000 RWF")</li>
            <li>3. Interactive buttons appear for pay/get paid options</li>
            <li>4. QR code is generated and sent automatically</li>
            <li>5. Customer completes payment using QR code</li>
          </ol>
        </CardContent>
      </Card>

      {onClose && (
        <Button onClick={onClose} variant="outline" className="w-full">
          Close
        </Button>
      )}
    </div>
  );
};