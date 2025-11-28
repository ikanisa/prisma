import { Card, CardContent } from '@/components/ui/card';
import type { EngagementRecord } from '@/lib/engagements';

interface EngagementStatsProps {
  engagements: EngagementRecord[];
}

export function EngagementStats({ engagements }: EngagementStatsProps) {
  const totalEngagements = engagements.length;
  const activeEngagements = engagements.filter(e => e.status === 'IN_PROGRESS' || e.status === 'REVIEW').length;
  const auditClients = engagements.filter(e => e.is_audit_client).length;
  const needsReview = engagements.filter(e => !e.independence_checked && e.is_audit_client).length;

  const stats = [
    { label: 'Total Engagements', value: totalEngagements },
    { label: 'Active', value: activeEngagements },
    { label: 'Audit Clients', value: auditClients },
    { label: 'Needs Review', value: needsReview, highlight: needsReview > 0 },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className={`text-sm ${stat.highlight ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
              {stat.label}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
