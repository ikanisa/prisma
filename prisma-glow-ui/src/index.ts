// UI Components
export { Button } from './components/ui/button';
export type { ButtonProps } from './components/ui/button';

export { Badge } from './components/ui/badge';
export type { BadgeProps } from './components/ui/badge';

export { Skeleton } from './components/ui/skeleton';
export type { SkeletonProps } from './components/ui/skeleton';

export { DataCard } from './components/ui/DataCard';
export { EmptyState } from './components/ui/EmptyState';
export { SmartInput } from './components/ui/SmartInput';

// Layout Components
export { Container } from './components/layout/Container';
export { Grid } from './components/layout/Grid';
export { Stack } from './components/layout/Stack';
export { AnimatedPage } from './components/layout/AnimatedPage';
export { AdaptiveLayout } from './components/layout/AdaptiveLayout';
export { Sidebar } from './components/layout/Sidebar';
export { MobileNav } from './components/layout/MobileNav';
export { Header } from './components/layout/Header';

// Smart Components
export { CommandPalette } from './components/smart/CommandPalette';
export { FloatingAssistant } from './components/smart/FloatingAssistant';
export { QuickActions } from './components/smart/QuickActions';

// Accessibility
export { SkipLinks } from './components/a11y/SkipLinks';

// Hooks
export { useResponsive } from './hooks/useResponsive';
export { useFocusTrap } from './hooks/useFocusTrap';
export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
export { useLocalAI } from './hooks/useLocalAI';

// Utilities
export { cn } from './lib/utils';
export * from './lib/animations';

// Pages
export { DashboardPage } from './pages/Dashboard';
export { AgentsPage } from './pages/AgentsPage';
export { TasksPage } from './pages/TasksPage';
