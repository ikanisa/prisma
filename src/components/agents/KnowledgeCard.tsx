/**
 * KnowledgeCard Component
 * 
 * Displays a knowledge source with status and actions.
 */

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, FileText, RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface KnowledgeSource {
  id: string;
  name: string;
  description?: string;
  source_type: string;
  content_type: string;
  vector_indexed: boolean;
  chunk_count: number;
  is_active: boolean;
}

interface KnowledgeCardProps {
  knowledge: KnowledgeSource;
  onReindex?: (knowledge: KnowledgeSource) => void;
  onDelete?: (knowledge: KnowledgeSource) => void;
}

export function KnowledgeCard({ knowledge, onReindex, onDelete }: KnowledgeCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">{knowledge.name}</CardTitle>
            </div>
            {knowledge.description && (
              <CardDescription className="text-xs mt-1">{knowledge.description}</CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReindex?.(knowledge)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reindex
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(knowledge)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{knowledge.source_type}</Badge>
            <Badge variant="outline">{knowledge.content_type}</Badge>
            {knowledge.is_active ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            {knowledge.vector_indexed ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">
                  Indexed ({knowledge.chunk_count} chunks)
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-muted-foreground">Not indexed</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
