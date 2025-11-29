import { FileText, Download, Eye, Calendar } from 'lucide-react';

const documents = [
  { id: 1, name: 'Tax Return 2024.pdf', type: 'PDF', date: '2024-01-15', size: '2.4 MB' },
  { id: 2, name: '1099 Form.pdf', type: 'PDF', date: '2024-01-10', size: '156 KB' },
  { id: 3, name: 'W-2 Statement.pdf', type: 'PDF', date: '2024-01-08', size: '89 KB' },
];

export default function ClientDocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Your Documents
        </h2>
        <p className="text-muted-foreground">
          Access and download your tax documents
        </p>
      </div>

      {/* Documents List */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Available Documents</h3>
        </div>
        <div className="divide-y divide-border">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{doc.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{doc.type}</span>
                    <span>•</span>
                    <span>{doc.size}</span>
                    <span>•</span>
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(doc.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent">
                  <Eye className="h-4 w-4" />
                </button>
                <button className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
