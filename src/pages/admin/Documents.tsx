import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Trash2, FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
}

interface Document {
  id: string;
  agent_id: string;
  title: string;
  storage_path: string;
  embedding_ok: boolean;
  created_at: string;
  drive_file_id?: string;
  drive_mime?: string;
  agents?: Agent;
}

interface UploadFormData {
  agent_id: string;
  title: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UploadFormData>({
    agent_id: "",
    title: ""
  });
  const [driveLink, setDriveLink] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [documentsResult, agentsResult] = await Promise.all([
        supabase
          .from("agent_documents")
          .select(`
            *,
            agents!inner (
              id,
              name
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("agents")
          .select("id, name, status")
          .order("name")
      ]);

      if (documentsResult.error) throw documentsResult.error;
      if (agentsResult.error) throw agentsResult.error;

      setDocuments(documentsResult.data || []);
      setAgents(agentsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileInputRef.current?.files?.[0]) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive"
      });
      return;
    }

    if (!formData.agent_id) {
      toast({
        title: "Error",
        description: "Please select an agent",
        variant: "destructive"
      });
      return;
    }

    const file = fileInputRef.current.files[0];
    const allowedTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Only PDF, TXT, CSV, and DOCX files are allowed",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      // Upload file to correct storage bucket path
      const fileName = `docs/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: insertError } = await supabase
        .from("agent_documents")
        .insert([{
          agent_id: formData.agent_id,
          title: formData.title || file.name,
          storage_path: `uploads/${fileName}`
        }]);

      if (insertError) throw insertError;

      toast({ title: "Success", description: "Document uploaded successfully" });
      setDialogOpen(false);
      setFormData({ agent_id: "", title: "" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      fetchData();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation(); // Prevent triggering the card click
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      // Delete from storage
      const fileName = doc.storage_path.replace('uploads/', '');
      await supabase.storage
        .from('uploads')
        .remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from("agent_documents")
        .delete()
        .eq("id", doc.id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Document deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const handlePreview = async (doc: Document) => {
    try {
      const fileName = doc.storage_path.replace('uploads/', '');
      const { data, error } = await supabase.storage
        .from('uploads')
        .createSignedUrl(fileName, 60);

      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error("Error previewing document:", error);
      toast({
        title: "Error",
        description: "Failed to preview document",
        variant: "destructive"
      });
    }
  };

  const extractFileId = (url: string) => {
    // Handle both file and folder URLs
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return fileMatch?.[1] || folderMatch?.[1] || url;
  };

  const handleAddFromDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveLink.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Google Drive link",
        variant: "destructive"
      });
      return;
    }

    try {
      const driveId = extractFileId(driveLink);
      
      const { error } = await supabase
        .from('agent_learning')
        .insert({
          agent_id: null,
          source_type: 'gdrive',
          source_detail: driveId,
          vectorize: true
        });

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: "Drive source saved – will embed at next sync" 
      });
      setDriveLink('');
    } catch (error: any) {
      console.error('Error adding Drive source:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add Drive source",
        variant: "destructive"
      });
    }
  };

  const handleCleanupAndSync = async () => {
    setSyncLoading(true);
    try {
      // First cleanup the data
      await supabase.functions.invoke('cleanup-gdrive-data');
      
      // Then sync
      const { error } = await supabase.functions.invoke('import-gdrive-docs');
      
      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: "Drive sync completed successfully" 
      });
      fetchData(); // Refresh the documents list
    } catch (error: any) {
      console.error('Error during sync:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync",
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncLoading(true);
    try {
      const { error } = await supabase.functions.invoke('import-gdrive-docs');
      
      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: "Drive sync started successfully" 
      });
      fetchData(); // Refresh the documents list
    } catch (error: any) {
      console.error('Error starting sync:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start sync",
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agent Documents</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Agent</label>
                <select
                  value={formData.agent_id}
                  onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select an agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Title (optional)</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Leave empty to use filename"
                />
              </div>
              <div>
                <label className="text-sm font-medium">File</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.txt,.csv,.docx"
                    required
                  />
                  <Upload className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: PDF, TXT, CSV, DOCX
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handlePreview(doc)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <CardTitle className="text-base font-medium">{doc.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={doc.embedding_ok ? "default" : "secondary"}>
                  {doc.embedding_ok ? "Embedded" : "Processing"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreview(doc)}
                  title="Preview document"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDelete(e, doc)}
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <span className="font-medium">Agent:</span> {doc.agents?.name}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Uploaded: {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {documents.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No documents found. Upload documents to provide context and knowledge to your agents.</p>
          </CardContent>
        </Card>
      )}

      {/* Google Drive Integration Section */}
      <div className="mt-8 border-t pt-6">
        <h2 className="text-2xl font-bold mb-4">Google Drive Integration</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Add from Drive */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add from Google Drive</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddFromDrive} className="space-y-3">
                <Input
                  type="text"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="Paste Drive file or folder URL..."
                />
                <Button type="submit" className="w-full">
                  Add from Drive
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Manual Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manual Sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Manually trigger a sync of all configured Google Drive sources.
              </p>
               <div className="grid gap-2">
                 <Button 
                   onClick={handleSyncNow} 
                   disabled={syncLoading}
                   className="w-full"
                   variant="outline"
                 >
                   {syncLoading ? "Syncing..." : "Run Sync Now"}
                 </Button>
                 <Button 
                   onClick={handleCleanupAndSync} 
                   disabled={syncLoading}
                   className="w-full"
                 >
                   {syncLoading ? "Processing..." : "Cleanup & Sync"}
                 </Button>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Drive Documents Table */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Google Drive Documents</h3>
          {documents.filter(doc => doc.drive_file_id).length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Drive File ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">MIME Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Embedded</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.filter(doc => doc.drive_file_id).map((doc) => (
                        <tr key={doc.id} className="border-t hover:bg-muted/50">
                          <td className="px-4 py-3">{doc.title}</td>
                          <td className="px-4 py-3 font-mono text-sm">{doc.drive_file_id}</td>
                          <td className="px-4 py-3 text-sm">{doc.drive_mime || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <Badge variant={doc.embedding_ok ? "default" : "secondary"}>
                              {doc.embedding_ok ? 'Embedded' : 'Pending'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No Google Drive documents found. Add some Drive files to get started.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}