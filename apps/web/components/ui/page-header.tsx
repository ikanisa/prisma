import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-6 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm shadow-brand-500/10 backdrop-blur',
        'sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{eyebrow}</p>
        ) : null}
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
