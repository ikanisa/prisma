import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  File, 
  Image as ImageIcon, 
  Video, 
  Music, 
  X,
  Camera,
  Paperclip
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileUploaderProps {
  onFileUpload: (file: File, type: string) => Promise<void>;
  onClose: () => void;
  className?: string;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
}

export function FileUploader({
  onFileUpload,
  onClose,
  className,
  maxFileSize = 10, // 10MB default
  allowedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*']
}: FileUploaderProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `File size must be less than ${maxFileSize}MB`,
        variant: "destructive"
      });
      return false;
    }

    // Check file type
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.type === type;
    });

    if (!isAllowed) {
      toast({
        title: "File type not supported",
        description: "Please select a supported file type",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!validateFile(file)) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Determine file type category
      let fileType = 'file';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('audio/')) fileType = 'audio';

      await onFileUpload(file, fileType);
      
      setUploadProgress(100);
      setTimeout(() => {
        onClose();
      }, 500);

      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully`
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onFileUpload, onClose, validateFile, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return ImageIcon;
      case 'video':
        return Video;
      case 'audio':
        return Music;
      default:
        return File;
    }
  };

  const quickUploadTypes = [
    { type: 'image', label: 'Photo', icon: ImageIcon, accept: 'image/*' },
    { type: 'video', label: 'Video', icon: Video, accept: 'video/*' },
    { type: 'audio', label: 'Audio', icon: Music, accept: 'audio/*' },
    { type: 'document', label: 'Document', icon: File, accept: '.pdf,.doc,.docx,.txt' }
  ];

  return (
    <div className={cn(
      "border rounded-lg bg-background shadow-lg p-4 w-80",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Upload File</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Quick Upload Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {quickUploadTypes.map((type) => {
          const Icon = type.icon;
          return (
            <label key={type.type} className="cursor-pointer">
              <input
                type="file"
                accept={type.accept}
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2"
                disabled={isUploading}
                asChild
              >
                <div>
                  <Icon className="h-6 w-6" />
                  <span className="text-xs">{type.label}</span>
                </div>
              </Button>
            </label>
          );
        })}
      </div>

      {/* Drag & Drop Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag and drop files here
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          or
        </p>
        <label className="cursor-pointer">
          <input
            type="file"
            accept={allowedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={isUploading}
          />
          <Button variant="outline" size="sm" disabled={isUploading} asChild>
            <span>
              <Paperclip className="h-4 w-4 mr-2" />
              Browse Files
            </span>
          </Button>
        </label>
      </div>

      {/* File Info */}
      <div className="mt-4 text-xs text-muted-foreground">
        <p>Maximum file size: {maxFileSize}MB</p>
        <p>Supported: Images, Videos, Audio, Documents</p>
      </div>
    </div>
  );
}