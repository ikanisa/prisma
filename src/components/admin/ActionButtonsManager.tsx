import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

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
  const [buttons, setButtons] = useState<ActionButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<ActionButton | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    domain: '',
    label: '',
    payload: '',
    description: '',
    template_eligible: true
  });

  useEffect(() => {
    fetchButtons();
  }, []);

  const fetchButtons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('action_buttons')
        .select('*')
        .order('domain', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;
      setButtons(data || []);
    } catch (error) {
      console.error('Error fetching buttons:', error);
      toast.error('Failed to load action buttons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingButton) {
        // Update existing button
        const { error } = await supabase
          .from('action_buttons')
          .update({
            domain: formData.domain,
            label: formData.label,
            payload: formData.payload,
            description: formData.description
          })
          .eq('id', editingButton.id);

        if (error) throw error;
        toast.success('Action button updated successfully');
      } else {
        // Create new button
        const { error } = await supabase
          .from('action_buttons')
          .insert({
            id: formData.id,
            domain: formData.domain,
            label: formData.label,
            payload: formData.payload,
            description: formData.description
          });

        if (error) throw error;
        toast.success('Action button created successfully');
      }

      setIsDialogOpen(false);
      setEditingButton(null);
      setFormData({ id: '', domain: '', label: '', payload: '', description: '', template_eligible: true });
      fetchButtons();
    } catch (error) {
      console.error('Error saving button:', error);
      toast.error('Failed to save action button');
    }
  };

  const handleEdit = (button: ActionButton) => {
    setEditingButton(button);
    setFormData({
      id: button.id,
      domain: button.domain,
      label: button.label,
      payload: button.payload,
      description: button.description,
      template_eligible: button.template_eligible ?? true
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (buttonId: string) => {
    if (!confirm('Are you sure you want to delete this action button?')) return;

    try {
      const { error } = await supabase
        .from('action_buttons')
        .delete()
        .eq('id', buttonId);

      if (error) throw error;
      toast.success('Action button deleted successfully');
      fetchButtons();
    } catch (error) {
      console.error('Error deleting button:', error);
      toast.error('Failed to delete action button');
    }
  };

  const seedButtons = async () => {
    try {
      const response = await supabase.functions.invoke('action-buttons-seeder');
      if (response.error) throw response.error;
      
      toast.success('Action buttons seeded successfully');
      fetchButtons();
    } catch (error) {
      console.error('Error seeding buttons:', error);
      toast.error('Failed to seed action buttons');
    }
  };

  const filteredButtons = buttons.filter(button => {
    const matchesSearch = button.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         button.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         button.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDomain = selectedDomain === 'all' || button.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  const buttonsByDomain = DOMAINS.reduce((acc, domain) => {
    acc[domain] = filteredButtons.filter(b => b.domain === domain).length;
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
          <Button onClick={seedButtons} variant="outline">
            Seed Default Buttons
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingButton(null);
                setFormData({ id: '', domain: '', label: '', payload: '', description: '', template_eligible: true });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Button
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingButton ? 'Edit Action Button' : 'Create Action Button'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="id">Button ID</Label>
                  <Input
                    id="id"
                    value={formData.id}
                    onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="e.g., PAY_QR"
                    disabled={!!editingButton}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="domain">Domain</Label>
                  <Select value={formData.domain} onValueChange={(value) => setFormData(prev => ({ ...prev, domain: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOMAINS.map(domain => (
                        <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., 💸 Generate QR"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="payload">Payload</Label>
                  <Input
                    id="payload"
                    value={formData.payload}
                    onChange={(e) => setFormData(prev => ({ ...prev, payload: e.target.value }))}
                    placeholder="e.g., PAY_QR"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of what this button does"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingButton ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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

      {/* Filters */}
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
        <Select value={selectedDomain} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {DOMAINS.map(domain => (
              <SelectItem key={domain} value={domain}>{domain}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Buttons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Action Buttons ({filteredButtons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Payload</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Template?</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredButtons.map((button) => (
                  <TableRow key={button.id}>
                    <TableCell className="font-mono text-xs">{button.id}</TableCell>
                    <TableCell>
                      <span className="badge badge-secondary">{button.domain}</span>
                    </TableCell>
                    <TableCell>{button.label}</TableCell>
                    <TableCell className="font-mono text-xs">{button.payload}</TableCell>
                    <TableCell className="max-w-xs truncate">{button.description}</TableCell>
                    <TableCell>{button.template_eligible ? '✅' : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(button)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(button.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}