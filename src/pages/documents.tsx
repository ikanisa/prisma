import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Download, Search, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/file-upload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useOrganizations } from '@/hooks/use-organizations';
import {
  createSignedDocumentUrl,
  DocumentRecord,
  listDocuments,
  uploadDocument,
} from '@/lib/documents';

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function Documents() {
  const { toast } = useToast();
  const { currentOrg } = useOrganizations();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | null>(null);

  const orgSlug = currentOrg?.slug ?? null;

  useEffect(() => {
    if (!orgSlug) {
      setDocuments([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const docs = await listDocuments({ orgSlug, page });
        if (page === 1) {
          setDocuments(docs);
        } else {
          setDocuments((prev) => [...prev, ...docs]);
        }
        setHasMore(docs.length === 20);
      } catch (error) {
        toast({
          title: 'Unable to load documents',
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orgSlug, page, toast]);

  useEffect(() => {
    setPage(1);
  }, [orgSlug]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [documents, searchQuery]);

  const handleUpload = async (files: File[]) => {
    if (!orgSlug) {
      toast({
        title: 'No organization selected',
        description: 'Choose an organization before uploading documents.',
        variant: 'destructive',
      });
      return;
    }

    try {
      for (const file of files) {
        const document = await uploadDocument(file, { orgSlug });
        setDocuments((prev) => [document, ...prev]);
        toast({
          title: 'Document uploaded',
          description: `${document.name} is ready.`,
        });
      }
      setUploadOpen(false);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const createSignedUrl = async (document: DocumentRecord) => {
    try {
      const url = await createSignedDocumentUrl(document.id);
      return url;
    } catch (error) {
      toast({
        title: 'Unable to generate link',
        description: (error as Error).message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handlePreview = async (document: DocumentRecord) => {
    try {
      const url = await createSignedUrl(document);
      setPreviewDocument(document);
      setPreviewUrl(url);
    } catch (error) {
      // toast handled inside createSignedUrl
    }
  };

  const handleDownload = async (document: DocumentRecord) => {
    try {
      const url = await createSignedUrl(document);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      // toast handled inside createSignedUrl
    }
  };

  if (!currentOrg) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="mt-2 text-muted-foreground">
          Join or select an organization to manage documents.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Documents</h1>
          <p className="text-muted-foreground">
            Upload, organize, and preview files for {currentOrg.name}
          </p>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient">
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Documents</DialogTitle>
              <DialogDescription>
                Select files to upload to your document library.
              </DialogDescription>
            </DialogHeader>
            <FileUpload
              onUpload={handleUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
              multiple
              maxSize={20}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading && documents.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading documents...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((document, index) => (
            <motion.div
              key={document.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover-lift glass">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span className="truncate">{document.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => void handlePreview(document)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => void handleDownload(document)}
                        title="Download"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">{document.file_type?.toUpperCase() ?? 'FILE'}</Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(document.file_size)} • {new Date(document.created_at).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && documents.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents yet</h3>
          <p className="text-muted-foreground mb-4">
            Upload your first document to get started
          </p>
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
        </div>
      )}

      {!loading && documents.length > 0 && filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents found</h3>
          <p className="text-muted-foreground">Try adjusting your search query</p>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setPage((prev) => prev + 1)} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Load more'}
          </Button>
        </div>
      )}

      <Dialog
        open={Boolean(previewUrl)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewUrl(null);
            setPreviewDocument(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewDocument?.name ?? 'Document preview'}</DialogTitle>
            <DialogDescription>
              Signed links expire quickly. Generate a new preview if you need more time.
            </DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title="Document preview"
              className="h-[70vh] w-full rounded border"
            />
          ) : (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating preview...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
