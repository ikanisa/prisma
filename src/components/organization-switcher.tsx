import { useState } from 'react';
import { Check, ChevronsUpDown, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useOrganizations } from '@/hooks/use-organizations';
import { useNavigate } from 'react-router-dom';

export function OrganizationSwitcher() {
  const [open, setOpen] = useState(false);
  const { memberships, currentOrg, switchOrganization } = useOrganizations();
  const navigate = useNavigate();

  const handleSelect = (orgId: string, orgSlug: string) => {
    switchOrganization(orgId);
    setOpen(false);
    navigate(`/${orgSlug}/dashboard`);
  };

  if (!currentOrg) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building className="w-4 h-4" />
        No organization selected
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            <span className="truncate">{currentOrg.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search organizations..." />
          <CommandList>
            <CommandEmpty>No organizations found.</CommandEmpty>
            <CommandGroup>
              {memberships.map((membership) => (
                <CommandItem
                  key={membership.org_id}
                  value={membership.organization.name}
                  onSelect={() => handleSelect(membership.org_id, membership.organization.slug)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentOrg.id === membership.org_id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{membership.organization.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {membership.role.toLowerCase()}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}