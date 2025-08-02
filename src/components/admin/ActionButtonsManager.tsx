import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ActionButton {
  id: string;
  domain: string;
  label: string;
  payload: string;
  description: string;
  created_at: string;
  template_eligible?: boolean;
}

const DOMAINS = [
  'core', 'payments', 'mobility_driver', 'mobility_pass', 'ordering', 
  'partner', 'listings_prop', 'listings_veh', 'marketing', 'support', 
  'dev', 'qa', 'lang', 'profile', 'onboarding'
];

export function ActionButtonsManager() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for now to resolve build errors
  const mockButtons = [
    { id: 'PAY_QR', domain: 'payments', label: '💸 Generate QR', payload: 'PAY_QR', description: 'Generate QR code for payment', created_at: new Date().toISOString() },
    { id: 'GET_RIDE', domain: 'mobility', label: '🚖 Get Ride', payload: 'GET_RIDE', description: 'Request a ride', created_at: new Date().toISOString() }
  ];

  const buttonsByDomain = DOMAINS.reduce((acc, domain) => {
    acc[domain] = mockButtons.filter(b => b.domain === domain).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Action Buttons Manager</h1>
          <p className="text-muted-foreground">
            Manage WhatsApp action buttons for interactive messages
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            Database Connection Required
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {DOMAINS.map(domain => (
          <Card key={domain}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{domain}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{buttonsByDomain[domain]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search buttons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Mock Data Notice */}
      <Card>
        <CardHeader>
          <CardTitle>Action Buttons (Demo Mode)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Database connection required to manage action buttons.</p>
            <p className="text-sm mt-2">This interface will be functional once the Supabase types are properly generated.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}