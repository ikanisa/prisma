import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  Bell,
  Activity,
  Settings,
  BarChart3,
  Plus,
  Search,
  ShieldCheck,
  Calculator,
  ClipboardCheck,
  AlarmClock,
} from "lucide-react";
import { useOrganizations } from "@/hooks/use-organizations";
import { useClients } from "@/hooks/use-clients";
import { useEngagements } from "@/hooks/use-engagements";
import { useTasks } from "@/hooks/use-tasks";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { orgSlug } = useParams();
  const { currentOrg } = useOrganizations();
  const activeOrgId = currentOrg?.id ?? undefined;
  const { data: clients = [] } = useClients(activeOrgId);
  const { data: engagements = [] } = useEngagements(activeOrgId);
  const { data: tasks = [] } = useTasks(activeOrgId);
  const resolvedSlug = orgSlug ?? currentOrg?.slug ?? "";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  const navigationItems = [
    {
      name: "Dashboard",
      icon: BarChart3,
      action: () => navigate(`/${resolvedSlug}/dashboard`),
    },
    {
      name: "Clients",
      icon: Users,
      action: () => navigate(`/${resolvedSlug}/clients`),
    },
    {
      name: "Engagements",
      icon: Briefcase,
      action: () => navigate(`/${resolvedSlug}/engagements`),
    },
    {
      name: "Audit Workspace",
      icon: ShieldCheck,
      action: () => navigate(`/${resolvedSlug}/audit/controls`),
    },
    {
      name: "Accounting Close",
      icon: Calculator,
      action: () => navigate(`/${resolvedSlug}/accounting`),
    },
    {
      name: "Onboarding Checklist",
      icon: ClipboardCheck,
      action: () => navigate(`/${resolvedSlug}/onboarding`),
    },
    {
      name: "Autopilot",
      icon: AlarmClock,
      action: () => navigate(`/${resolvedSlug}/autopilot`),
    },
    {
      name: "Agent Configuration",
      icon: ShieldCheck,
      action: () => navigate(`/${resolvedSlug}/agents/configuration`),
    },
    {
      name: "Tasks",
      icon: CheckSquare,
      action: () => navigate(`/${resolvedSlug}/tasks`),
    },
    {
      name: "Documents",
      icon: FileText,
      action: () => navigate(`/${resolvedSlug}/documents`),
    },
    {
      name: "Notifications",
      icon: Bell,
      action: () => navigate(`/${resolvedSlug}/notifications`),
    },
    {
      name: "Activity",
      icon: Activity,
      action: () => navigate(`/${resolvedSlug}/activity`),
    },
    {
      name: "Settings",
      icon: Settings,
      action: () => navigate(`/${resolvedSlug}/settings`),
    },
  ];

  const quickActions = [
    {
      name: "Add New Client",
      icon: Plus,
      action: () => navigate(`/${resolvedSlug}/clients?action=create`),
    },
    {
      name: "Create Engagement",
      icon: Plus,
      action: () => navigate(`/${resolvedSlug}/engagements?action=create`),
    },
    {
      name: "New Task",
      icon: Plus,
      action: () => navigate(`/${resolvedSlug}/tasks?action=create`),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 glass border-white/20 max-w-2xl">
        <Command className="bg-transparent border-0">
          <CommandInput
            placeholder="Search clients, engagements, tasks..."
            className="border-0 focus:ring-0"
          />
          <CommandList className="max-h-96">
            <CommandEmpty>No results found.</CommandEmpty>
            
            <CommandGroup heading="Navigation">
              {navigationItems.map((item) => (
                <CommandItem
                  key={item.name}
                  onSelect={() => runCommand(item.action)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Quick Actions">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.name}
                  onSelect={() => runCommand(action.action)}
                  className="cursor-pointer"
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  <span>{action.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            {clients.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Clients">
                  {clients.slice(0, 5).map((client) => (
                    <CommandItem
                      key={client.id}
                      onSelect={() => runCommand(() => navigate(`/${orgSlug}/clients/${client.id}`))}
                      className="cursor-pointer"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>{client.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {client.industry}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {tasks.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Recent Tasks">
                  {tasks.slice(0, 5).map((task) => (
                    <CommandItem
                      key={task.id}
                      onSelect={() => runCommand(() => navigate(`/${orgSlug}/tasks/${task.id}`))}
                      className="cursor-pointer"
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      <span>{task.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {task.status}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
