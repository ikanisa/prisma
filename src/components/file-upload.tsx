import { useCallback, useState } from 'react';
import { Upload, X, File, Image } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFileUpload, UploadedFile } from '@/hooks/use-file-upload';

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
}

export function FileUpload({ 
  onFilesUploaded, 
  accept = "*/*", 
  multiple = true,
  maxSize = 10 
}: FileUploadProps) {
  const { uploading, progress, uploadMultipleFiles } = useFileUpload();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > maxSize * 1024 * 1024) {
        console.warn(`File ${file.name} exceeds ${maxSize}MB limit`);
        return false;
      }
      return true;
    });

    setSelectedFiles(validFiles);
  }, [maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  }, [handleFiles]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      const uploadedFiles = await uploadMultipleFiles(selectedFiles as any);
      onFilesUploaded(uploadedFiles);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card
        className={`transition-colors border-2 border-dashed ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Max file size: {maxSize}MB
          </p>
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <Button variant="outline" asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              Select Files
            </label>
          </Button>
        </CardContent>
      </Card>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {file.type.startsWith('image/') ? (
                    <Image className="h-5 w-5 text-blue-500" />
                  ) : (
                    <File className="h-5 w-5 text-gray-500" />
                  )}
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
          
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Uploading... {progress}%
              </p>
            </div>
          )}
          
          <Button 
            onClick={handleUpload} 
            disabled={uploading || selectedFiles.length === 0}
            className="w-full"
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} file(s)`}
          </Button>
        </div>
      )}
    </div>
  );
}