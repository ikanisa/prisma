import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AssistantChipProps extends HTMLMotionProps<'button'> {
  label: string;
  description?: string;
  disabled?: boolean;
}

export function AssistantChip({ label, description, disabled, className, ...props }: AssistantChipProps) {
  return (
    <motion.button
      className={cn(
        'group relative overflow-hidden rounded-full border border-border bg-muted/60 px-4 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      type="button"
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled}
      {...props}
    >
      <span className="relative z-10 block font-medium text-foreground">{label}</span>
      {description ? <span className="relative z-10 block text-xs text-muted-foreground">{description}</span> : null}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: disabled ? 0 : undefined }}
      />
    </motion.button>
  );
}
