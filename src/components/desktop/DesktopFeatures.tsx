/**
 * DesktopFeatures Component
 * 
 * Demonstrates native desktop features when running in Tauri.
 */

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useTauri, useFileSystem, useWindow } from '@/hooks/useTauri';
import { FileText, Download, Upload, Monitor, Maximize2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export function DesktopFeatures() {
  const { isTauri, platform, version } = useTauri();
  const { selectFile, selectSaveFile, readFile, writeFile } = useFileSystem();
  const { isFullscreen, toggleFullscreen } = useWindow();
  
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContents, setFileContents] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectFile = async () => {
    setIsLoading(true);
    try {
      const file = await selectFile({
        multiple: false,
        filters: [
          { name: 'Text Files', extensions: ['txt', 'md', 'json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (file && typeof file === 'string') {
        setSelectedFile(file);
        const contents = await readFile(file);
        setFileContents(contents);
        toast({
          title: 'File loaded',
          description: \`Successfully loaded \${file.split('/').pop()}\`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error loading file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isTauri) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            Desktop Features
          </CardTitle>
          <CardDescription>
            Desktop features are only available in the native app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You're currently using the web version. Desktop features include native file system access, system tray, offline mode, and auto-updates.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Desktop App Active
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Platform:</span>
            <Badge variant="outline">{platform}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Version:</span>
            <Badge variant="outline">{version}</Badge>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            File Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSelectFile} disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" />
            Open File
          </Button>
          {selectedFile && (
            <Textarea value={fileContents} onChange={(e) => setFileContents(e.target.value)} rows={10} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
