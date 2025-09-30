import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Download, Search, Eye, Loader2, Trash2, RotateCcw } from 'lucide-react';
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
  deleteDocument,
  DocumentRecord,
  listDocuments,
  uploadDocument,
  restoreDocument,
} from '@/lib/documents';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/hooks/use-i18n';

const CLIENT_DEFAULT_REPO = '03_Accounting/PBC';
const CLIENT_ALLOWED_REPOS = ['03_Accounting/PBC', '02_Tax/PBC', '04_Audit/PBC'];

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function Documents() {
  const { toast } = useToast();
  const { currentOrg, currentRole, hasRole } = useOrganizations();
  const { t } = useI18n();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | null>(null);
  const [view, setView] = useState<'active' | 'archived'>('active');

  const isClient = currentRole === 'CLIENT';
  const canArchive = hasRole('MANAGER');
  const uploadRepo = isClient ? CLIENT_DEFAULT_REPO : undefined;

  const orgSlug = currentOrg?.slug ?? null;

  useEffect(() => {
    if (!orgSlug) {
      setDocuments([]);
      setHasMore(false);
      return;
    }

    const loadInitial = async () => {
      setLoading(true);
      try {
        const docs = await listDocuments({ orgSlug, page: 1, state: view });
        setDocuments(docs);
        setHasMore(docs.length === 20);
        setPage(1);
      } catch (error) {
        toast({
          title: t('documents.error.loadTitle'),
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    void loadInitial();
  }, [orgSlug, view, toast, t]);

  useEffect(() => {
    if (!orgSlug || page === 1) {
      return;
    }

    const loadMore = async () => {
      setLoading(true);
      try {
        const docs = await listDocuments({ orgSlug, page, state: view });
        setDocuments((prev) => [...prev, ...docs]);
        setHasMore(docs.length === 20);
      } catch (error) {
        toast({
          title: t('documents.error.loadTitle'),
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    void loadMore();
  }, [orgSlug, page, view, toast, t]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [documents, searchQuery]);

  const handleUpload = async (files: File[]) => {
    if (!orgSlug) {
      toast({
        title: t('documents.error.noOrgTitle'),
        description: t('documents.error.noOrgDescription'),
        variant: 'destructive',
      });
      return;
    }

    try {
      for (const file of files) {
        const document = await uploadDocument(file, { orgSlug, ...(uploadRepo ? { repoFolder: uploadRepo } : {}) });
        if (view === 'active') {
          setDocuments((prev) => [document, ...prev]);
        }
        toast({
          title: t('documents.toast.uploadedTitle'),
          description: t('documents.toast.uploadedDescription', { name: document.name }),
        });
      }
      setUploadOpen(false);
    } catch (error) {
      toast({
        title: t('documents.error.uploadTitle'),
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
        title: t('documents.error.linkTitle'),
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

  const handleArchive = async (document: DocumentRecord) => {
    if (!canArchive) {
      toast({ title: 'Insufficient permissions', description: 'Requires Manager or above.', variant: 'destructive' });
      return;
    }

    if (!confirm('Archive this document? You can restore it later from the Archived tab.')) {
      return;
    }

    try {
      await deleteDocument(document.id);
      setDocuments((prev) => prev.filter((entry) => entry.id !== document.id));
      toast({ title: t('documents.toast.archivedTitle'), description: t('documents.toast.archivedDescription', { name: document.name }) });
    } catch (error) {
      toast({
        title: t('documents.error.archiveTitle'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async (document: DocumentRecord) => {
    if (!canArchive) {
      toast({ title: 'Insufficient permissions', description: 'Requires Manager or above.', variant: 'destructive' });
      return;
    }

    try {
      await restoreDocument(document.id);
      setDocuments((prev) => prev.filter((entry) => entry.id !== document.id));
      toast({ title: t('documents.toast.restoredTitle'), description: t('documents.toast.restoredDescription', { name: document.name }) });
    } catch (error) {
      toast({
        title: t('documents.error.restoreTitle'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  if (!currentOrg) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">{t('documents.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('documents.empty')}</p>
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
          <h1 className="text-3xl font-bold gradient-text">{t('documents.title')}</h1>
          <p className="text-muted-foreground">{t('documents.subtitle')}</p>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" title={isClient ? `Uploads limited to ${CLIENT_ALLOWED_REPOS.join(', ')}` : undefined}>
              <Upload className="w-4 h-4 mr-2" />
              {isClient ? 'Upload PBC Files' : 'Upload Files'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Documents</DialogTitle>
              <DialogDescription>
                {isClient
                  ? `Files are stored in the permitted client repositories (${CLIENT_ALLOWED_REPOS.join(', ')}).`
                  : 'Select files to upload to your document library.'}
              </DialogDescription>
            </DialogHeader>
            <FileUpload
              onUpload={handleUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
              multiple
              maxSize={20}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as 'active' | 'archived')}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

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
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4" />
                      <span className="truncate">{document.name}</span>
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {document.repo_folder ? (
                        <Badge variant="outline" className="uppercase">
                          {document.repo_folder}
                        </Badge>
                      ) : null}
                      {document.classification ? (
                        <Badge variant="secondary">{document.classification}</Badge>
                      ) : null}
                      {document.deleted ? <Badge variant="destructive">Archived</Badge> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePreview(document)}>
                      <Eye className="w-4 h-4 mr-2" /> Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(document)}>
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                    {view === 'active' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleArchive(document)}
                        disabled={!canArchive}
                        title={!canArchive ? 'Requires Manager or above' : undefined}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Archive
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(document)}
                        disabled={!canArchive}
                        title={!canArchive ? 'Requires Manager or above' : undefined}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" /> Restore
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Uploaded</span>
                    <span>{new Date(document.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Size</span>
                    <span>{formatFileSize(document.file_size)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Type</span>
                    <span>{document.file_type ?? 'Unknown'}</span>
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
          <Button
            variant="outline"
            onClick={() => setUploadOpen(true)}
            title={isClient ? `Uploads limited to ${CLIENT_ALLOWED_REPOS.join(', ')}` : undefined}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isClient ? 'Upload PBC Files' : 'Upload Files'}
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
