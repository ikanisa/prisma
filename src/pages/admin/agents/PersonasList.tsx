import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Eye, Edit, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  description?: string;
}

interface Persona {
  id: string;
  agent_id: string;
  tone: string;
  language: string;
  personality: string;
  instructions: string;
  updated_at: string;
}

export default function PersonasList() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    if (!id) return;

    try {
      const [agentResult, personasResult] = await Promise.all([
        supabase.from('agents').select('*').eq('id', id).single(),
        supabase.from('agent_personas').select('*').eq('agent_id', id).order('updated_at', { ascending: false })
      ]);

      if (agentResult.error && agentResult.error.code !== 'PGRST116') {
        throw agentResult.error;
      }

      setAgent(agentResult.data);
      setPersonas(personasResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch persona data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Agent Not Found</h1>
          <Button asChild>
            <Link to="/admin/agents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Agents
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link to={`/admin/agents/${agent.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Agent
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Agent Personas</h1>
            <p className="text-muted-foreground">
              Manage personas for {agent.name}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/admin/agents/${agent.id}/personas/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Persona
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Personas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personas.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Languages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(personas.map(p => p.language)).size}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(personas.map(p => p.tone)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {personas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Personas Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first persona to define how this agent should behave in conversations.
            </p>
            <Button asChild>
              <Link to={`/admin/agents/${agent.id}/personas/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Persona
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Personas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personas.map((persona) => (
              <Card key={persona.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{persona.tone}</CardTitle>
                    <Badge variant="outline">
                      {persona.language.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {persona.personality || 'No personality defined'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/agents/${agent.id}/personas/${persona.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/agents/${agent.id}/personas/${persona.id}/edit`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Personas Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Personas</CardTitle>
              <CardDescription>
                Detailed view of all personas for this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tone</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Personality</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personas.map((persona) => (
                    <TableRow key={persona.id}>
                      <TableCell className="font-medium">{persona.tone}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {persona.language.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">
                          {persona.personality || 'No personality defined'}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(persona.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/agents/${agent.id}/personas/${persona.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/agents/${agent.id}/personas/${persona.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}