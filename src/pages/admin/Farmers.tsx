import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, RefreshCw, Tractor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Farmer {
  id: string;
  name: string;
  phone?: string;
  location?: string;
  status: string;
  listings_count: number;
  created_at: string;
}

export default function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchFarmers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('farmers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setFarmers(data);
      }
    } catch (error) {
      console.error('Error fetching farmers:', error);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => { 
    fetchFarmers(); 
  }, [fetchFarmers]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Tractor className="w-6 h-6" /> Farmers Management
        </h1>
        <div className="flex gap-2">
          <Input
            placeholder="Search by name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-64" 
          />
          <Button variant="secondary" onClick={fetchFarmers} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-1', loading && 'animate-spin')} /> 
            Refresh
          </Button>
          <Button>
            <PlusCircle className="w-4 h-4 mr-1" /> Add Farmer
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid xl:grid-cols-3 lg:grid-cols-2 sm:grid-cols-1 gap-4">
        {farmers.map(farmer => (
          <Card 
            key={farmer.id} 
            className="hover:ring-2 hover:ring-primary/30 cursor-pointer transition"
          >            
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-medium text-lg truncate" title={farmer.name}>
                  {farmer.name}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {farmer.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {farmer.location || '—'}
              </p>
              <div className="mt-3 text-xs flex justify-between text-muted-foreground">
                <span>Listings: {farmer.listings_count}</span>
                <span>Joined: {new Date(farmer.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!loading && farmers.length === 0) && (
          <p className="col-span-full text-center text-muted-foreground py-10">
            No farmers found.
          </p>
        )}
      </div>
    </section>
  );
}