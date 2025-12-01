import { motion } from 'framer-motion';
import { Building2, Globe2, Mail } from 'lucide-react';
import { ClientOnboardingAgent } from '@/components/clients/client-onboarding-agent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClients } from '@/hooks/use-clients';
import { useOrganizations } from '@/hooks/use-organizations';

export function Clients() {
  const { currentOrg } = useOrganizations();
  const activeOrgId = currentOrg?.id ?? '';
  const activeOrgName = currentOrg?.name ?? 'Select an organisation to continue';
  const {
    data: clients = [],
    isLoading,
    isFetching,
  } = useClients(activeOrgId);
  const isBusy = isLoading || isFetching;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="space-y-1">
        <h1 className="text-3xl font-bold gradient-text">Client Onboarding</h1>
        <p className="text-muted-foreground">
          Work conversationally with the Prisma Glow agent to create rich client profiles and capture the supporting documents that were used.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ClientOnboardingAgent />
        <aside className="space-y-4">
          <Card className="glass border border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-primary" />
                Active clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The agent stores every confirmed profile here. When you add the next client, it will appear at the top of this list automatically.
              </p>
              <div className="mt-4 rounded-2xl border border-dashed border-primary/30 bg-primary/10 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Total clients</span>
                  <Badge variant="secondary">{isBusy ? '—' : clients.length}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                  <Globe2 className="h-4 w-4" />
                  {activeOrgName}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" />
                Recently onboarded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[18rem] pr-3">
                <div className="space-y-3">
                  {!activeOrgId && (
                    <p className="text-sm text-muted-foreground">
                      Select an organisation to view its clients.
                    </p>
                  )}
                  {activeOrgId && isBusy && (
                    <p className="text-sm text-muted-foreground">Loading clients…</p>
                  )}
                  {activeOrgId && !isBusy && clients.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      You have not added any clients yet. The agent will populate this section once a client is created.
                    </p>
                  )}
                  {clients.map((client) => (
                    <div key={client.id} className="rounded-xl border border-white/10 bg-background/60 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{client.name}</span>
                        <Badge variant="outline">{client.industry}</Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <p>Country: {client.country}</p>
                        <p>FYE: {client.fiscalYearEnd}</p>
                        <p>Contact: {client.contactName} ({client.contactEmail})</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>
      </div>
    </motion.div>
  );
}
