import { Users, Plus, Search, Building2, Mail, Phone } from 'lucide-react';

const clients = [
  { id: 1, name: 'Acme Corporation', email: 'contact@acme.com', phone: '+1 (555) 123-4567', status: 'active' },
  { id: 2, name: 'TechStart Inc.', email: 'info@techstart.io', phone: '+1 (555) 234-5678', status: 'active' },
  { id: 3, name: 'Global Traders LLC', email: 'hello@globaltraders.com', phone: '+1 (555) 345-6789', status: 'pending' },
];

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Clients
          </h2>
          <p className="text-muted-foreground">
            Manage your client relationships
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search clients..."
          className="w-full rounded-lg border border-input bg-background px-10 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Clients Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <div
            key={client.id}
            className="rounded-lg border border-border bg-card p-6"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-primary/10 p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  client.status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}
              >
                {client.status}
              </span>
            </div>
            <h3 className="mt-4 font-semibold text-foreground">{client.name}</h3>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{client.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{client.phone}</span>
              </div>
            </div>
            <button className="mt-4 w-full rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent">
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
