import { motion } from 'framer-motion';
import { Home, FileText, CheckSquare, Sparkles, Menu } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'dashboard', label: 'Home', icon: Home, href: '/' },
  { id: 'documents', label: 'Documents', icon: FileText, href: '/documents' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/tasks' },
  { id: 'ai', label: 'AI', icon: Sparkles, href: '/ai-assistant' },
  { id: 'menu', label: 'More', icon: Menu, href: '/menu' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.id}
              to={item.href}
              className="relative flex flex-col items-center gap-1 px-3 py-2"
            >
              <div className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground'
              )}>
                <item.icon className="h-5 w-5" />
                
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 rounded-full bg-primary"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </div>
              
              <span className={cn(
                'text-xs font-medium transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
