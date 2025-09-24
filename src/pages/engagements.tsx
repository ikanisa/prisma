import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Button as UIButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EngagementForm } from '@/components/forms/engagement-form';
import { useAppStore, Engagement } from '@/stores/mock-data';

export function Engagements() {
  const { currentOrg, getOrgEngagements, getOrgClients } = useAppStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEngagement, setEditingEngagement] = useState<Engagement | null>(null);
  
  const engagements = getOrgEngagements(currentOrg?.id || '');
  const clients = getOrgClients(currentOrg?.id || '');

  const handleEdit = (engagement: Engagement) => {
    setEditingEngagement(engagement);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingEngagement(null);
    setFormOpen(true);
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PLANNING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      REVIEW: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Engagements</h1>
          <p className="text-muted-foreground">Track project progress and deliverables</p>
        </div>
        <Button variant="gradient" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Create Engagement
        </Button>
      </div>

      <div className="grid gap-6">
        {engagements.map((engagement, index) => (
          <motion.div
            key={engagement.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover-lift glass">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <div>
                    <span>{getClientName(engagement.clientId)}</span>
                    <Badge className="ml-2" variant="outline">{engagement.type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(engagement.status)}>
                      {engagement.status.replace('_', ' ')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(engagement)}
                      className="h-6 w-6"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Period: {engagement.periodStart} - {engagement.periodEnd}</p>
                  <div className="mt-3 flex gap-2">
                    <UIButton variant="default" size="sm" asChild>
                      <Link to={`/${currentOrg?.slug}/engagements/${engagement.id}/acceptance`}>
                        Acceptance & independence
                      </Link>
                    </UIButton>
                    <UIButton variant="outline" size="sm" asChild>
                      <Link to={`/${currentOrg?.slug}/engagements/${engagement.id}/reporting/kam`}>
                        Open KAM Module
                      </Link>
                    </UIButton>
                    <UIButton variant="outline" size="sm" asChild>
                      <Link to={`/${currentOrg?.slug}/engagements/${engagement.id}/reporting/report`}>
                        Open Report Builder
                      </Link>
                    </UIButton>
                    <UIButton variant="outline" size="sm" asChild>
                      <Link to={`/${currentOrg?.slug}/engagements/${engagement.id}/reporting/tcwg`}>
                        Open TCWG Pack
                      </Link>
                    </UIButton>
                    <UIButton variant="outline" size="sm" asChild>
                      <Link to={`/${currentOrg?.slug}/engagements/${engagement.id}/reporting/pbc`}>
                        Open PBC Manager
                      </Link>
                    </UIButton>
                    <UIButton variant="outline" size="sm" asChild>
                      <Link to={`/${currentOrg?.slug}/engagements/${engagement.id}/reporting/controls`}>
                        Open Controls
                      </Link>
                    </UIButton>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <EngagementForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        engagement={editingEngagement}
      />
    </motion.div>
  );
}
