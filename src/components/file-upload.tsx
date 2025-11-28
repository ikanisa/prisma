import { useCallback, useId, useMemo, useState } from 'react';
import { Upload, X, File, Image, AlertCircle } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { logger } from '@/lib/logger';
import { useEmptyStateCopy } from '@/lib/system-config';

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  disabled?: boolean;
  disabledReason?: string;
  helperText?: string;
  allowDirectories?: boolean;
}

export function FileUpload({
  onUpload,
  accept = '*/*',
  multiple = true,
  maxSize = 10,
  disabled = false,
  disabledReason,
  helperText,
  allowDirectories = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputId = useId();
  const documentPromptCopy = useEmptyStateCopy('documents', "Drop files here. I’ll read them and extract what’s needed.");
  const isDisabled = disabled || uploading;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled) {
      return;
    }
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, [isDisabled]);

  const handleFiles = useCallback((files: File[]) => {
    if (isDisabled) return;
    setErrorMessage(null);
    const validFiles = files.filter((file) => {
      if (file.size > maxSize * 1024 * 1024) {
        logger.warn('file-upload.too-large', { name: file.name, size: file.size, maxSizeMb: maxSize });
        setErrorMessage(`“${file.name}” exceeds the ${maxSize}MB limit.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(validFiles);
  }, [isDisabled, maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled) {
      return;
    }
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles, isDisabled]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (isDisabled) return;
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setProgress(0);
    try {
      await onUpload(selectedFiles);
      setProgress(100);
      setSelectedFiles([]);
      setErrorMessage(null);
    } catch (error) {
      logger.error('file-upload.failed', error);
      setErrorMessage('Upload failed. Please try again or contact support.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const helperCopy = useMemo(() => {
    if (isDisabled) {
      return disabledReason ?? 'Uploading is disabled for your role.';
    }
    if (helperText) return helperText;
    const maxCopy = `Max file size: ${maxSize}MB`;
    return multiple ? `${maxCopy} · You can select multiple files.` : maxCopy;
  }, [disabledReason, helperText, isDisabled, maxSize, multiple]);

  return (
    <div className="space-y-4">
      <Card
        className={`transition-colors border-2 border-dashed ${
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        aria-disabled={isDisabled}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center" aria-live="polite">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">{documentPromptCopy}</p>
          <p className={`text-sm mb-4 ${isDisabled ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>{helperCopy}</p>
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
            className="hidden"
            id={inputId}
            disabled={isDisabled}
            {...(allowDirectories
              ? { webkitdirectory: 'true', directory: 'true' }
              : {})}
          />
          <Button variant="outline" asChild disabled={isDisabled}>
            <label htmlFor={inputId} className="cursor-pointer">
              Select Files
            </label>
          </Button>
        </CardContent>
      </Card>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <Card key={file.name + index} className="p-3" data-testid="file-upload-item">
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
                  aria-label={`Remove ${file.name}`}
                  type="button"
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

          <div className="flex items-center gap-3">
            <Button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0 || disabled}
              className="flex-1"
            >
              {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedFiles([])}
              disabled={uploading || selectedFiles.length === 0}
              type="button"
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
