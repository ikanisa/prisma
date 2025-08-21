import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientForm } from '@/components/forms/client-form';
import { useAppStore, Client } from '@/stores/mock-data';

export function Clients() {
  const { currentOrg, getOrgClients } = useAppStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const clients = getOrgClients(currentOrg?.id || '');

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Clients</h1>
          <p className="text-muted-foreground">Manage your client relationships</p>
        </div>
        <Button variant="gradient" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover-lift glass">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{client.name}</span>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{client.industry}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(client)}
                      className="h-6 w-6"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Contact: {client.contactName}</p>
                  <p>Country: {client.country}</p>
                  <p>FYE: {client.fiscalYearEnd}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <ClientForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        client={editingClient}
      />
    </motion.div>
  );
}