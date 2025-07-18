import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';

interface Memory {
  id: string;
  user_id: string;
  memory_type: string;
  memory_value: string;
  updated_at: string;
}

export function MemoryView() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_memory')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMemories = memories.filter(memory => 
    memory.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memory.memory_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memory.memory_value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMemoryTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'user_type': return 'default';
      case 'conversation_count': return 'secondary';
      case 'sales_stage': return 'default';
      case 'last_interaction': return 'outline';
      default: return 'default';
    }
  };

  const groupedMemories = filteredMemories.reduce((acc, memory) => {
    if (!acc[memory.user_id]) {
      acc[memory.user_id] = [];
    }
    acc[memory.user_id].push(memory);
    return acc;
  }, {} as Record<string, Memory[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Agent Memory</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search memories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMemories}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedMemories).map(([userId, userMemories]) => (
            <div key={userId} className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 font-mono text-sm">
                User: {userId.substring(0, 20)}...
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {userMemories.map((memory) => (
                  <div key={memory.id} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={getMemoryTypeBadgeVariant(memory.memory_type)}>
                        {memory.memory_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(memory.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{memory.memory_value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {Object.keys(groupedMemories).length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No memories found. Start a conversation to see agent memory.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}