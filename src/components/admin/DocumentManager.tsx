import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  Eye,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface Document {
  id: string;
  agent_id: string;
  title: string;
  storage_path: string;
  drive_mime: string;
  embedding_ok: boolean;
  created_at: string;
}

interface DocumentManagerProps {
  agentId?: string;
}

export function DocumentManager({ agentId = 'default' }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [agentId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Check if agentId is a valid UUID format
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(agentId);
      
      let query = supabase
        .from('agent_documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Only filter by agent_id if it's a valid UUID
      if (isValidUUID) {
        query = query.eq('agent_id', agentId);
      } else {
        // For non-UUID agentIds like "omni-agent", filter by null or show all
        query = query.is('agent_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove file extension
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('agent_id', agentId);
      formData.append('title', title || selectedFile.name);

      console.log('Uploading document:', {
        fileName: selectedFile.name,
        agentId,
        title: title || selectedFile.name
      });

      const response = await supabase.functions.invoke('upload-persona-doc', {
        body: formData
      });

      console.log('Upload response:', response);

      if (response.error) {
        throw new Error(response.error.message || 'Upload failed');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Upload failed');
      }

      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });

      // Reset form
      setSelectedFile(null);
      setTitle('');
      
      // Refresh documents list
      await fetchDocuments();

      // Trigger single comprehensive processing pipeline
      await triggerFullDocumentProcessing(response.data.document.id);

    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const processDocument = async (documentId: string) => {
    try {
      const response = await supabase.functions.invoke('document-processor', {
        body: { 
          document_id: documentId,
          stage: 'all'
        }
      });

      if (response.error) {
        console.error('Document processing error:', response.error);
        toast({
          title: "Processing Warning",
          description: "Document uploaded but processing failed",
          variant: "default"
        });
      } else {
        toast({
          title: "OpenAI Processing Started",
          description: "Document is being summarized and embedded with OpenAI"
        });
      }
    } catch (error) {
      console.error('Error processing document:', error);
    }
  };

  const triggerFullDocumentProcessing = async (documentId: string) => {
    try {
      // Step 1: Vectorize document for embeddings
      const vectorizeResponse = await supabase.functions.invoke('vectorize-docs', {
        body: { document_id: documentId }
      });

      // Step 2: Add to knowledge base for RAG
      const knowledgeResponse = await supabase.functions.invoke('knowledge-manager', {
        body: {
          action: 'add',
          document_id: documentId,
          source: 'document_upload'
        }
      });

      // Step 3: Trigger agent learning updates
      const learningResponse = await supabase.functions.invoke('dynamic-learning-processor', {
        body: {
          action: 'process_document_upload',
          document_id: documentId,
          trigger_source: 'admin_upload'
        }
      });

      console.log('Full processing pipeline triggered:', {
        vectorize: vectorizeResponse.data,
        knowledge: knowledgeResponse.data,
        learning: learningResponse.data
      });

      toast({
        title: "Complete AI Pipeline Activated",
        description: "Document processing, RAG integration, and agent learning initiated"
      });

    } catch (error) {
      console.error('Error in full processing pipeline:', error);
      toast({
        title: "Pipeline Warning",
        description: "Some advanced processing may have failed",
        variant: "default"
      });
    }
  };

  const deleteDocument = async (doc: Document) => {
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('agent_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('persona-docs')
        .remove([doc.storage_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Don't throw error for storage deletion failure
      }

      setDocuments(documents.filter(d => d.id !== doc.id));
      
      toast({
        title: "Success",
        description: "Document deleted"
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('persona-docs')
        .download(doc.storage_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Document downloaded"
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive"
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('text')) return '📝';
    if (mimeType.includes('document')) return '📄';
    return '📁';
  };

  const getFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Add new documents for AI learning and knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.txt,.md,.json"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({getFileSize(selectedFile.size)})
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="doc-title">Document Title</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title..."
              />
            </div>
          </div>
          
          <Button 
            onClick={uploadDocument} 
            disabled={!selectedFile || uploading}
            className="w-full md:w-auto"
          >
            {uploading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Document Library</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const failedDocs = documents.filter(doc => !doc.embedding_ok);
                  console.log('Processing failed docs:', failedDocs.length);
                  failedDocs.forEach(doc => triggerFullDocumentProcessing(doc.id));
                }}
                disabled={documents.length === 0}
              >
                Process All Failed ({documents.filter(doc => !doc.embedding_ok).length})
              </Button>
              <Button variant="outline" size="sm" onClick={fetchDocuments}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage uploaded documents and their processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getFileIcon(doc.drive_mime)}</span>
                    <div>
                      <h4 className="font-medium">{doc.title}</h4>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{doc.drive_mime}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex gap-2">
                      <Badge variant={doc.embedding_ok ? "default" : "destructive"}>
                        {doc.embedding_ok ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            AI Processed
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Processing Failed
                          </>
                        )}
                      </Badge>
                      {doc.embedding_ok && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerFullDocumentProcessing(doc.id)}
                        >
                          Re-process
                        </Button>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadDocument(doc)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteDocument(doc)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}