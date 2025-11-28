import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DocumentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  view: 'active' | 'archived';
  onViewChange: (view: 'active' | 'archived') => void;
}

export function DocumentFilters({ 
  searchQuery, 
  onSearchChange, 
  view, 
  onViewChange 
}: DocumentFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <Tabs value={view} onValueChange={(v) => onViewChange(v as 'active' | 'archived')}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
