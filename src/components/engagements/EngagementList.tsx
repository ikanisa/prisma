import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EngagementCard } from './EngagementCard';
import type { EngagementRecord } from '@/lib/engagements';

interface EngagementListProps {
  engagements: EngagementRecord[];
  loading?: boolean;
  onEdit: (engagement: EngagementRecord) => void;
  onDelete: (engagement: EngagementRecord) => void;
}

export function EngagementList({ engagements, loading, onEdit, onDelete }: EngagementListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (engagements.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No engagements yet. Create one to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {engagements.map((engagement, index) => (
        <motion.div
          key={engagement.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <EngagementCard
            engagement={engagement}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </motion.div>
      ))}
    </div>
  );
}
