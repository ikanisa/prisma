import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DocumentCard } from './DocumentCard';
import type { DocumentRecord } from '@/lib/documents';

interface DocumentListProps {
  documents: DocumentRecord[];
  loading?: boolean;
  canArchive?: boolean;
  onPreview: (document: DocumentRecord) => void;
  onDownload: (document: DocumentRecord) => void;
  onDelete: (document: DocumentRecord) => void;
  onRestore?: (document: DocumentRecord) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function DocumentList({ 
  documents, 
  loading, 
  canArchive,
  onPreview, 
  onDownload, 
  onDelete,
  onRestore,
  onLoadMore,
  hasMore
}: DocumentListProps) {
  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No documents found. Upload one to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {documents.map((document, index) => (
          <motion.div
            key={document.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <DocumentCard
              document={document}
              onPreview={onPreview}
              onDownload={onDownload}
              onDelete={onDelete}
              onRestore={onRestore}
              canArchive={canArchive}
            />
          </motion.div>
        ))}
      </div>

      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
