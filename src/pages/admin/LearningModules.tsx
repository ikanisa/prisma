import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Link, Clock, CheckCircle, XCircle, AlertTriangle, Upload, Eye, ThumbsUp, ThumbsDown } from 'lucide-react'
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface LearningModule {
  id: string
  title: string
  source_type: string
  source_path: string
  agent_scope: string
  status: string
  summary?: string
  auto_tags?: string[]
  relevance_score?: number
  vector_count: number
  created_at: string
  updated_at: string
}

interface PipelineStage {
  stage: string
  status: string
  log?: string
  completed_at?: string
}

const statusColors = {
  uploaded: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  needs_review: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
}

const sourceIcons = {
  pdf: FileText,
  docx: FileText,
  url: Link,
  txt: FileText
}

export default function LearningModules() {
  const [modules, setModules] = useState<LearningModule[]>([])
  const [filteredModules, setFilteredModules] = useState<LearningModule[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null)
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchModules()
  }, [])

  useEffect(() => {
    let filtered = modules
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter)
    }
    
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.auto_tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    setFilteredModules(filtered)
  }, [modules, statusFilter, searchTerm])

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_modules')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setModules(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch learning modules",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPipelineStages = async (moduleId: string) => {
    try {
      const { data, error } = await supabase
        .from('ingestion_pipeline')
        .select('*')
        .eq('module_id', moduleId)
        .order('stage')

      if (error) throw error
      setPipelineStages(data || [])
    } catch (error: any) {
      console.error('Failed to fetch pipeline stages:', error)
    }
  }

  const handleUrlUpload = async (url: string, title: string, agentScope: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ingest-url', {
        body: { url, title, agent_scope: agentScope }
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "URL ingestion started successfully"
      })

      setShowUploadDialog(false)
      fetchModules()
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || "Failed to ingest URL",
        variant: "destructive"
      })
    }
  }

  const handleReview = async (decision: 'approved' | 'rejected' | 'needs_fix') => {
    if (!selectedModule) return

    try {
      const { data: user } = await supabase.auth.getUser()
      
      const { error } = await supabase.functions.invoke('module-review', {
        body: {
          module_id: selectedModule.id,
          decision,
          notes: reviewNotes,
          reviewer_id: user.user?.id
        }
      })

      if (error) throw error

      toast({
        title: "Success",
        description: `Module ${decision} successfully`
      })

      setShowReviewDialog(false)
      setReviewNotes('')
      setSelectedModule(null)
      fetchModules()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to review module",
        variant: "destructive"
      })
    }
  }

  const UploadDialog = () => {
    const [url, setUrl] = useState('')
    const [title, setTitle] = useState('')
    const [agentScope, setAgentScope] = useState('MarketingAgent')

    return (
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Learning Module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/document"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="Document title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="agent">Agent Scope</Label>
              <Select value={agentScope} onValueChange={setAgentScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MarketingAgent">Marketing Agent</SelectItem>
                  <SelectItem value="PaymentAgent">Payment Agent</SelectItem>
                  <SelectItem value="SupportAgent">Support Agent</SelectItem>
                  <SelectItem value="LogisticsAgent">Logistics Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => handleUrlUpload(url, title, agentScope)}
              disabled={!url}
              className="w-full"
            >
              Start Ingestion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const ReviewDialog = () => (
    <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Learning Module</DialogTitle>
        </DialogHeader>
        {selectedModule && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Title</h4>
                <p className="text-sm text-muted-foreground">{selectedModule.title}</p>
              </div>
              <div>
                <h4 className="font-medium">Source</h4>
                <p className="text-sm text-muted-foreground">{selectedModule.source_path}</p>
              </div>
              <div>
                <h4 className="font-medium">Agent Scope</h4>
                <Badge variant="outline">{selectedModule.agent_scope}</Badge>
              </div>
              <div>
                <h4 className="font-medium">Vectors</h4>
                <p className="text-sm text-muted-foreground">{selectedModule.vector_count} chunks</p>
              </div>
            </div>

            {selectedModule.summary && (
              <div>
                <h4 className="font-medium mb-2">Summary</h4>
                <p className="text-sm bg-muted p-3 rounded">{selectedModule.summary}</p>
              </div>
            )}

            {selectedModule.auto_tags && selectedModule.auto_tags.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Auto-generated Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedModule.auto_tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">Pipeline Status</h4>
              <div className="space-y-2">
                {pipelineStages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {stage.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {stage.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                    {stage.status === 'pending' && <Clock className="w-4 h-4 text-gray-400" />}
                    <span className="capitalize">{stage.stage}</span>
                    <Badge variant={stage.status === 'completed' ? 'default' : 'secondary'}>
                      {stage.status}
                    </Badge>
                    {stage.log && <span className="text-xs text-muted-foreground">({stage.log})</span>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Review Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this module..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => handleReview('approved')}
                className="flex-1"
                variant="default"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button 
                onClick={() => handleReview('rejected')}
                className="flex-1"
                variant="destructive"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Learning Modules</h1>
          <p className="text-muted-foreground">Manage AI agent knowledge base</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Add Module
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search modules or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="uploaded">Uploaded</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>
            {filteredModules.length} of {modules.length} modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vectors</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredModules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No modules found</TableCell>
                </TableRow>
              ) : (
                filteredModules.map((module) => {
                  const SourceIcon = sourceIcons[module.source_type as keyof typeof sourceIcons] || FileText
                  return (
                    <TableRow key={module.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <SourceIcon className="w-4 h-4" />
                          <span className="font-medium">{module.title || 'Untitled'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{module.source_type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[module.status as keyof typeof statusColors] || ''}>
                          {module.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{module.vector_count}</TableCell>
                      <TableCell>
                        {module.auto_tags?.slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="mr-1">
                            {tag}
                          </Badge>
                        ))}
                        {(module.auto_tags?.length || 0) > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{(module.auto_tags?.length || 0) - 2} more
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(module.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedModule(module)
                            fetchPipelineStages(module.id)
                            setShowReviewDialog(true)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UploadDialog />
      <ReviewDialog />
    </div>
  )
}