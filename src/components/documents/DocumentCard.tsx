import { FileText, Download, Eye, Trash2, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/enhanced-button';
import { Badge } from '@/components/ui/badge';
import type { DocumentRecord } from '@/lib/documents';

interface DocumentCardProps {
  document: DocumentRecord;
  onPreview: (doc: DocumentRecord) => void;
  onDownload: (doc: DocumentRecord) => void;
  onDelete: (doc: DocumentRecord) => void;
  onRestore?: (doc: DocumentRecord) => void;
  canArchive: boolean;
  isArchived: boolean;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

export function DocumentCard({
  document,
  onPreview,
  onDownload,
  onDelete,
  onRestore,
  canArchive,
  isArchived,
}: DocumentCardProps) {
  return (
    <Card className="mb-2 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{document.name}</h3>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(document.file_size)} • {formatDate(document.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {document.classification && (
              <Badge variant="default" className="hidden sm:inline-flex">
                {document.classification}
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPreview(document)}
              title="Preview document"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDownload(document)}
              title="Download document"
            >
              <Download className="h-4 w-4" />
            </Button>
            {isArchived && onRestore ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRestore(document)}
                title="Restore document"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            ) : (
              canArchive && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(document)}
                  title="Archive document"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
