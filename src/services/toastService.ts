
import { toast } from '@/hooks/use-toast';
import { analyticsService } from './analyticsService';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const toastService = {
  success(title: string, description?: string, duration = 3000) {
    toast({
      title,
      description,
      duration,
      variant: 'default'
    });
    
    analyticsService.trackEvent('toast_shown', {
      type: 'success',
      title,
      description
    });
  },

  error(title: string, description?: string, duration = 5000) {
    toast({
      title,
      description,
      duration,
      variant: 'destructive'
    });
    
    analyticsService.trackEvent('toast_shown', {
      type: 'error',
      title,
      description
    });
  },

  info(title: string, description?: string, duration = 4000) {
    toast({
      title,
      description,
      duration,
      variant: 'default'
    });
    
    analyticsService.trackEvent('toast_shown', {
      type: 'info',
      title,
      description
    });
  },

  withAction(options: ToastOptions) {
    toast({
      title: options.title,
      description: options.description,
      variant: options.variant || 'default',
      duration: options.duration || 4000,
      action: options.action ? (
        <button
          onClick={options.action.onClick}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {options.action.label}
        </button>
      ) : undefined
    });
    
    analyticsService.trackEvent('toast_with_action_shown', {
      title: options.title,
      action_label: options.action?.label
    });
  }
};
