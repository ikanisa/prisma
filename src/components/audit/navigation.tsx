import { NavLink, useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type AuditNavItem = {
  to: string;
  label: string;
  description?: string;
};

const baseClasses =
  'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors';
const activeClasses = 'bg-slate-900 text-white shadow-sm';
const inactiveClasses = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';

export function AuditNavigation({ items }: { items: AuditNavItem[] }) {
  const location = useLocation();
  const { orgSlug } = useParams<{ orgSlug?: string }>();

  const resolvePath = (target: string) => {
    const sanitized = target.startsWith('/') ? target : `/${target}`;
    return orgSlug ? `/${orgSlug}/audit${sanitized}` : `/audit${sanitized}`;
  };

  return (
    <nav aria-label="Audit workspace sections">
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          const href = resolvePath(item.to);
          const isActive =
            location.pathname === href ||
            (location.pathname.startsWith(href) && location.pathname[href.length] === '/');

          return (
            <li key={item.to}>
              <NavLink
                to={href}
                className={() => cn(baseClasses, isActive ? activeClasses : inactiveClasses)}
              >
                <span>{item.label}</span>
                {item.description ? (
                  <span className="hidden text-xs font-normal text-slate-400 sm:inline">
                    {item.description}
                  </span>
                ) : null}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
