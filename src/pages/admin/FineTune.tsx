import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Download, Play, RefreshCw, Eye, Zap, Database, Cpu } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export default function FineTune() {
  const [exportParams, setExportParams] = useState({
    min_quality_score: 0.8,
    max_records: 1000,
    base_model: "gpt-3.5-turbo",
    model_suffix: "easymo-v1"
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch existing models
  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ["fine-tuned-models"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fine-tune-exporter", {
        body: { action: "list_models" }
      });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch training data export history
  const { data: exportHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["training-data-exports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_data_export")
        .select("*")
        .order("exported_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // Export training data
  const exportMutation = useMutation({
    mutationFn: async (params: any) => {
      const { data, error } = await supabase.functions.invoke("fine-tune-exporter", {
        body: {
          action: "export_training_data",
          export_params: params
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setExportResult(data);
      queryClient.invalidateQueries({ queryKey: ["training-data-exports"] });
      toast.success(`Exported ${data.total_pairs} training pairs`);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  // Start fine-tuning job
  const fineTuneMutation = useMutation({
    mutationFn: async (params: any) => {
      const { data, error } = await supabase.functions.invoke("fine-tune-exporter", {
        body: {
          action: "start_fine_tune",
          export_params: params
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fine-tuned-models"] });
      toast.success(`Fine-tune job started: ${data.job_id}`);
    },
    onError: (error) => {
      toast.error(`Fine-tune failed: ${error.message}`);
    },
  });

  // Check job status
  const statusMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("fine-tune-exporter", {
        body: {
          action: "check_job_status",
          fine_tune_job_id: jobId
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fine-tuned-models"] });
      toast.success(`Job status: ${data.status}`);
    },
  });

  const handleExport = () => {
    setIsExporting(true);
    exportMutation.mutate(exportParams);
  };

  const handleStartFineTune = () => {
    fineTuneMutation.mutate(exportParams);
  };

  const downloadJSONL = () => {
    if (!exportResult?.jsonl_data) return;
    
    const blob = new Blob([exportResult.jsonl_data], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `easymo-training-data-${Date.now()}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Fine-Tuning Management</h1>
          <p className="text-muted-foreground">
            Export training data and manage fine-tuned models
          </p>
        </div>
      </div>

      <Tabs defaultValue="export-data" className="space-y-6">
        <TabsList>
          <TabsTrigger value="export-data">Export Training Data</TabsTrigger>
          <TabsTrigger value="fine-tune-jobs">Fine-Tune Jobs</TabsTrigger>
          <TabsTrigger value="model-registry">Model Registry</TabsTrigger>
        </TabsList>

        <TabsContent value="export-data" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Export Configuration
                </CardTitle>
                <CardDescription>
                  Configure parameters for training data export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="min-quality">Minimum Quality Score</Label>
                  <Input
                    id="min-quality"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={exportParams.min_quality_score}
                    onChange={(e) => setExportParams(prev => ({
                      ...prev,
                      min_quality_score: parseFloat(e.target.value)
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Only export conversations with quality score above this threshold
                  </p>
                </div>

                <div>
                  <Label htmlFor="max-records">Maximum Records</Label>
                  <Input
                    id="max-records"
                    type="number"
                    value={exportParams.max_records}
                    onChange={(e) => setExportParams(prev => ({
                      ...prev,
                      max_records: parseInt(e.target.value)
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="base-model">Base Model</Label>
                  <Select
                    value={exportParams.base_model}
                    onValueChange={(value) => setExportParams(prev => ({
                      ...prev,
                      base_model: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="model-suffix">Model Suffix</Label>
                  <Input
                    id="model-suffix"
                    placeholder="easymo-v1"
                    value={exportParams.model_suffix}
                    onChange={(e) => setExportParams(prev => ({
                      ...prev,
                      model_suffix: e.target.value
                    }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleExport}
                    disabled={exportMutation.isPending}
                    className="flex-1"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {exportMutation.isPending ? "Exporting..." : "Export Data"}
                  </Button>
                  
                  <Button
                    onClick={handleStartFineTune}
                    disabled={fineTuneMutation.isPending}
                    className="flex-1"
                    variant="secondary"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {fineTuneMutation.isPending ? "Starting..." : "Start Fine-Tune"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export Results */}
            {exportResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export Results
                  </CardTitle>
                  <CardDescription>
                    Training data export summary
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Pairs:</span>
                      <span className="ml-2">{exportResult.total_pairs}</span>
                    </div>
                    <div>
                      <span className="font-medium">Format:</span>
                      <span className="ml-2">{exportResult.export_format}</span>
                    </div>
                    <div>
                      <span className="font-medium">File Size:</span>
                      <span className="ml-2">{(exportResult.jsonl_size / 1024).toFixed(1)}KB</span>
                    </div>
                  </div>

                  <div>
                    <Label>Data Preview</Label>
                    <Textarea
                      value={JSON.stringify(exportResult.data_preview, null, 2)}
                      readOnly
                      rows={8}
                      className="font-mono text-xs"
                    />
                  </div>

                  <Button onClick={downloadJSONL} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download JSONL File
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Export History */}
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
              <CardDescription>
                Previous training data exports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div>Loading export history...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exported At</TableHead>
                      <TableHead>Quality Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fine-Tune Job</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exportHistory?.slice(0, 10).map((export_record) => (
                      <TableRow key={export_record.id}>
                        <TableCell>
                          {format(parseISO(export_record.exported_at), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell>
                          {(export_record.quality_score * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              export_record.status === 'used'
                                ? 'default'
                                : export_record.status === 'exported'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {export_record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {export_record.fine_tune_job_id?.slice(0, 20) || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fine-tune-jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                OpenAI Fine-Tune Jobs
              </CardTitle>
              <CardDescription>
                Active and completed fine-tuning jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {modelsLoading ? (
                <div>Loading jobs...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models?.openai_jobs?.map((job: any) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-xs">
                          {job.id.slice(0, 20)}...
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              job.status === 'succeeded'
                                ? 'default'
                                : job.status === 'running'
                                ? 'secondary'
                                : job.status === 'failed'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {job.fine_tuned_model || job.model}
                        </TableCell>
                        <TableCell>
                          {format(new Date(job.created_at * 1000), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => statusMutation.mutate(job.id)}
                            disabled={statusMutation.isPending}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model-registry" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Registry</CardTitle>
              <CardDescription>
                Registered models and their performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {modelsLoading ? (
                <div>Loading models...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>OpenAI Model ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models?.registry_models?.map((model: any) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">
                          {model.model_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {model.model_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {model.openai_model_id}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              model.status === 'active'
                                ? 'default'
                                : model.status === 'training'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {model.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(model.created_at), 'MMM dd, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}