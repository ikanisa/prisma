import { formatDistanceToNow } from 'date-fns';
import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/enhanced-button';
import { Card, CardContent } from '@/components/ui/card';
import type { EngagementRecord, IndependenceConclusion } from '@/lib/engagements';

const statusColors: Record<string, string> = {
  PLANNING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  REVIEW: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

const independenceStatusStyles: Record<IndependenceConclusion, string> = {
  OK: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  SAFEGUARDS_REQUIRED: 'bg-amber-100 text-amber-800 border border-amber-200',
  PROHIBITED: 'bg-destructive/10 text-destructive border border-destructive/30',
  OVERRIDE: 'bg-amber-100 text-amber-800 border border-amber-200',
};

const independenceStatusLabels: Record<IndependenceConclusion, string> = {
  OK: 'Independence OK',
  SAFEGUARDS_REQUIRED: 'Safeguards required',
  PROHIBITED: 'Prohibited service',
  OVERRIDE: 'Override pending approval',
};

interface EngagementCardProps {
  engagement: EngagementRecord;
  onEdit: (engagement: EngagementRecord) => void;
  onDelete: (engagement: EngagementRecord) => void;
}

export function EngagementCard({ engagement, onEdit, onDelete }: EngagementCardProps) {
  const client = engagement.client;
  const updatedAgo = engagement.updated_at ? formatDistanceToNow(new Date(engagement.updated_at), { addSuffix: true }) : null;
  
  const independenceBadgeClass = independenceStatusStyles[engagement.independence_conclusion];
  const independenceCheckClass = engagement.independence_checked
    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    : 'bg-slate-100 text-slate-600 border border-slate-200';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold leading-tight text-foreground">{engagement.title}</h3>
            <p className="text-sm text-muted-foreground">{client.name}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(engagement)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(engagement)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <Badge className={statusColors[engagement.status ?? 'PLANNING']}>
          {engagement.status ?? 'Planning'}
        </Badge>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>{engagement.start_date ?? '—'}</span>
          <span>Budget: {engagement.budget ? `€${engagement.budget.toLocaleString()}` : '—'}</span>
          {updatedAgo && <span>Updated {updatedAgo}</span>}
        </div>

        <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Independence</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={independenceBadgeClass}>
                  {independenceStatusLabels[engagement.independence_conclusion]}
                </Badge>
                {engagement.is_audit_client && (
                  <Badge variant="outline" className={independenceCheckClass}>
                    {engagement.independence_checked ? 'Check complete' : 'Check pending'}
                  </Badge>
                )}
                {engagement.requires_eqr && (
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold">
                    Quality review
                  </Badge>
                )}
              </div>
            </div>
            {engagement.independence_conclusion_note && (
              <span className="rounded-md bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900 shadow-sm">
                {engagement.independence_conclusion_note}
              </span>
            )}
          </div>
          {engagement.non_audit_services.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {engagement.non_audit_services.map((svc) => (
                <Badge
                  key={svc.service}
                  variant="outline"
                  className={`text-xs font-medium border ${
                    svc.prohibited
                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                      : 'border-slate-200 bg-background text-foreground'
                  }`}
                >
                  {svc.service}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No non-audit services recorded.</p>
          )}
        </div>
        {engagement.description && <p className="text-sm">{engagement.description}</p>}
      </CardContent>
    </Card>
  );
}
