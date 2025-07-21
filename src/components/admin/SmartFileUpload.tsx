import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, FileText, CheckCircle, AlertCircle, Brain, 
  Database, FileSpreadsheet, FileType, File
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SmartFileUploadProps {
  targetTable: string;
  onUploadComplete: (result: any) => void;
  onError: (error: string) => void;
}

interface UploadResult {
  success: boolean;
  data?: any;
  message?: string;
  aiResponse?: string;
  error?: string;
}

export function SmartFileUpload({ targetTable, onUploadComplete, onError }: SmartFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    console.log('📁 File selected:', file.name, file.type, file.size);

    try {
      setUploading(true);
      setProgress(10);
      setResult(null);
      setPreviewData(null);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetTable', targetTable);
      formData.append('action', 'process');

      setProgress(30);

      // Call smart file processor edge function
      const { data, error } = await supabase.functions.invoke('smart-file-processor', {
        body: formData
      });

      setProgress(70);

      if (error) {
        throw new Error(error.message || 'Upload failed');
      }

      setProgress(90);

      console.log('🎯 Upload result:', data);

      if (data.success) {
        setResult(data);
        setPreviewData(data.data);
        setProgress(100);
        
        setTimeout(() => {
          onUploadComplete(data.data);
        }, 1500);
      } else {
        throw new Error(data.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      onError(error.message || 'Upload failed');
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setUploading(false);
    }
  }, [targetTable, onUploadComplete, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'csv':
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
      case 'json':
        return <FileType className="h-8 w-8 text-blue-500" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const getTableDescription = (table: string) => {
    const descriptions = {
      farmers: 'Farmer profiles with contact info, districts, and crop data',
      contacts: 'Contact information for customers, drivers, farmers, and prospects',
      businesses: 'Business entities like bars, pharmacies, and shops',
      drivers: 'Driver information for logistics and transportation',
      products: 'Product listings for the marketplace'
    };
    return descriptions[table] || 'Data entries for the specified table';
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-2 border-dashed">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              text-center p-8 rounded-lg transition-colors cursor-pointer
              ${isDragActive ? 'bg-primary/5 border-primary' : 'hover:bg-accent/50'}
              ${uploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Smart AI File Upload for {targetTable}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {getTableDescription(targetTable)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drop your file here or click to browse. Supports CSV, JSON, TXT, PDF, Excel files.
                </p>
              </div>

              {!uploading && (
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary animate-pulse" />
                <span className="font-medium">AI Processing...</span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${progress > 10 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>File Upload</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${progress > 50 ? 'bg-green-500' : progress > 10 ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span>AI Analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${progress > 90 ? 'bg-green-500' : progress > 70 ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span>Database Update</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {result.success ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Upload Successful!</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Upload Failed</span>
                </div>
              )}

              {previewData && (
                <div className="space-y-4">
                  <Separator />
                  <h4 className="font-semibold flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    Processing Results
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {previewData.totalRecords || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Records</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {previewData.insertedCount || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Inserted</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {previewData.errorCount || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Errors</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(((previewData.insertedCount || 0) / (previewData.totalRecords || 1)) * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                  </div>

                  {previewData.errors && previewData.errors.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-red-600">Errors:</h5>
                      <div className="bg-red-50 p-3 rounded-md max-h-32 overflow-y-auto">
                        {previewData.errors.slice(0, 5).map((error: string, index: number) => (
                          <div key={index} className="text-sm text-red-700">
                            {error}
                          </div>
                        ))}
                        {previewData.errors.length > 5 && (
                          <div className="text-sm text-red-600 font-medium">
                            ... and {previewData.errors.length - 5} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {previewData.summary && (
                    <div className="bg-blue-50 p-3 rounded-md">
                      <h5 className="font-medium text-blue-800 mb-2">AI Analysis Summary:</h5>
                      <p className="text-sm text-blue-700">
                        {previewData.summary.mapping_notes || 'Data processed successfully with intelligent field mapping.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {result.error && (
                <div className="bg-red-50 p-3 rounded-md">
                  <p className="text-sm text-red-700">{result.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Format Examples */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold mb-3">Supported File Formats</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4 text-green-500" />
              <span>CSV / Excel</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileType className="h-4 w-4 text-blue-500" />
              <span>JSON</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-red-500" />
              <span>PDF</span>
            </div>
            <div className="flex items-center space-x-2">
              <File className="h-4 w-4 text-gray-500" />
              <span>Text Files</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Our AI can intelligently extract {targetTable} data from any structured or unstructured file format.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}