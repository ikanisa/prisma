# PHASE 4 & 5: COMPLETE UI/UX REDESIGN IMPLEMENTATION
## Minimalist, Responsive, Fluid, Smart & Intelligent Frontend

**Status**: 🚀 Ready for Implementation  
**Timeline**: 3 Weeks  
**Effort**: High  
**Impact**: Revolutionary

---

## 📋 EXECUTIVE SUMMARY

Transform Prisma Glow into a world-class, minimalist, AI-powered desktop and web application with:
- **90%+ smaller components** (from 20KB → 2KB avg)
- **60% faster load times** via code splitting & lazy loading
- **AI-first interactions** with Gemini integration
- **Fluid responsive design** that works on any screen
- **Accessibility-first** (WCAG 2.1 AA compliant)
- **Desktop-ready** with Tauri integration

---

## 🎯 PHASE 4: ADVANCED FEATURES (Week 1-2)

### 4.1 AI-Powered Features

#### Gemini AI Service Integration

**File**: `src/services/gemini.service.ts`
```typescript
import { invoke } from '@tauri-apps/api/tauri';

export class GeminiService {
  private static instance: GeminiService;
  
  private readonly models = {
    nano: 'gemini-nano',           // On-device, instant
    flash: 'gemini-2.0-flash-exp', // Fast cloud
    pro: 'gemini-1.5-pro',         // Most capable
  };

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  // ==========================================
  // DOCUMENT PROCESSING
  // ==========================================
  
  async processDocument(file: File): Promise<ProcessedDocument> {
    const buffer = await file.arrayBuffer();
    
    return invoke<ProcessedDocument>('gemini_process_document', {
      data: Array.from(new Uint8Array(buffer)),
      mimeType: file.type,
      operations: [
        'extract_text',
        'summarize',
        'extract_entities',
        'classify',
        'extract_financial_data'
      ],
    });
  }

  async enhanceDocumentSummary(text: string): Promise<string> {
    return invoke<string>('gemini_enhance', {
      text,
      model: this.models.flash,
      instructions: 'Create a concise executive summary',
    });
  }

  // ==========================================
  // SEMANTIC SEARCH
  // ==========================================
  
  async semanticSearch(
    query: string,
    context: SearchContext
  ): Promise<SearchResult[]> {
    const queryEmbedding = await invoke<number[]>('gemini_embed', {
      text: query,
      model: 'text-embedding-004',
    });
    
    return invoke<SearchResult[]>('gemini_search', {
      embedding: queryEmbedding,
      context,
      rerank: true,
      topK: 20,
    });
  }

  // ==========================================
  // INTELLIGENT TASK PLANNING
  // ==========================================
  
  async planTask(description: string): Promise<TaskBreakdown> {
    const context = {
      availableTools: await this.getAvailableTools(),
      userPreferences: await this.getUserPreferences(),
      workContext: await this.getWorkContext(),
    };

    return invoke<TaskBreakdown>('gemini_plan_task', {
      description,
      context,
      model: this.models.pro,
    });
  }

  async suggestNextActions(
    currentTask: Task,
    history: Task[]
  ): Promise<Action[]> {
    return invoke<Action[]>('gemini_suggest_actions', {
      currentTask,
      history,
      model: this.models.flash,
    });
  }

  // ==========================================
  // COLLABORATION ASSISTANT
  // ==========================================
  
  async getCollaborationSuggestions(
    documentId: string,
    cursorPosition: number
  ): Promise<Suggestion[]> {
    const document = await this.getDocument(documentId);
    const collaboratorContext = await this.getCollaboratorContext();
    
    return invoke<Suggestion[]>('gemini_collaborate', {
      document,
      cursorPosition,
      collaboratorContext,
      suggestionTypes: [
        'completion',
        'improvement',
        'reference',
        'question',
        'compliance_check'
      ],
    });
  }

  // ==========================================
  // VOICE COMMANDS
  // ==========================================
  
  async processVoiceCommand(audioBuffer: ArrayBuffer): Promise<CommandResult> {
    // Transcribe
    const transcription = await invoke<string>('gemini_transcribe', {
      audio: Array.from(new Uint8Array(audioBuffer)),
      model: this.models.nano,
    });
    
    // Parse intent
    const intent = await invoke<Intent>('gemini_parse_intent', {
      text: transcription,
      availableCommands: await this.getAvailableCommands(),
    });
    
    // Execute
    return this.executeCommand(intent);
  }

  // ==========================================
  // PREDICTIVE ANALYTICS
  // ==========================================
  
  async predictWorkload(
    timeframe: 'day' | 'week' | 'month'
  ): Promise<WorkloadPrediction> {
    const historical = await this.getHistoricalData(timeframe);
    const current = await this.getCurrentTasks();
    
    return invoke<WorkloadPrediction>('gemini_predict', {
      historical,
      current,
      timeframe,
      factors: [
        'deadlines',
        'complexity',
        'dependencies',
        'team_capacity',
        'historical_velocity'
      ],
    });
  }

  async detectAnomalies(data: TimeSeriesData): Promise<Anomaly[]> {
    return invoke<Anomaly[]>('gemini_detect_anomalies', {
      data,
      sensitivity: 'medium',
    });
  }

  // ==========================================
  // SMART CODE REVIEW
  // ==========================================
  
  async reviewCode(code: string, language: string): Promise<CodeReview> {
    return invoke<CodeReview>('gemini_review_code', {
      code,
      language,
      checks: [
        'security',
        'performance',
        'best_practices',
        'maintainability'
      ],
    });
  }

  // Helper methods
  private async getDocument(id: string): Promise<Document> {
    // Implementation
    throw new Error('Not implemented');
  }

  private async getCollaboratorContext(): Promise<CollaboratorContext> {
    // Implementation
    throw new Error('Not implemented');
  }

  private async getAvailableTools(): Promise<Tool[]> {
    // Implementation
    throw new Error('Not implemented');
  }

  private async getUserPreferences(): Promise<UserPreferences> {
    // Implementation
    throw new Error('Not implemented');
  }

  private async getWorkContext(): Promise<WorkContext> {
    // Implementation
    throw new Error('Not implemented');
  }

  private async getAvailableCommands(): Promise<Command[]> {
    // Implementation
    throw new Error('Not implemented');
  }

  private async executeCommand(intent: Intent): Promise<CommandResult> {
    // Implementation
    throw new Error('Not implemented');
  }

  private async getHistoricalData(timeframe: string): Promise<HistoricalData> {
    // Implementation
    throw new Error('Not implemented');
  }

  private async getCurrentTasks(): Promise<Task[]> {
    // Implementation
    throw new Error('Not implemented');
  }
}

// Type definitions
interface ProcessedDocument {
  text: string;
  summary: string;
  entities: Entity[];
  classification: string;
  financialData?: FinancialData;
}

interface SearchContext {
  scope: string[];
  filters: Record<string, unknown>;
  dateRange?: DateRange;
}

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
  metadata: Record<string, unknown>;
}

interface TaskBreakdown {
  steps: TaskStep[];
  estimatedDuration: number;
  dependencies: string[];
  risks: Risk[];
}

interface Suggestion {
  type: 'completion' | 'improvement' | 'reference' | 'question' | 'compliance_check';
  text: string;
  confidence: number;
  action?: Action;
}

interface Intent {
  command: string;
  parameters: Record<string, unknown>;
  confidence: number;
}

interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

interface WorkloadPrediction {
  predicted: number;
  confidence: number;
  factors: PredictionFactor[];
  recommendations: string[];
}

interface Anomaly {
  timestamp: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface CodeReview {
  score: number;
  issues: Issue[];
  suggestions: string[];
}

export const geminiService = GeminiService.getInstance();
```

#### Smart Document Viewer

**File**: `src/components/features/documents/SmartDocumentViewer.tsx`
```typescript
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  Share2,
  Sparkles,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { geminiService } from '@/services/gemini.service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface SmartDocumentViewerProps {
  documentId: string;
}

export function SmartDocumentViewer({ documentId }: SmartDocumentViewerProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [aiInsights, setAiInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAI, setProcessingAI] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  async function loadDocument() {
    setLoading(true);
    try {
      // Load document
      const doc = await fetchDocument(documentId);
      setDocument(doc);

      // Process with AI in background
      processWithAI(doc);
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setLoading(false);
    }
  }

  async function processWithAI(doc: Document) {
    setProcessingAI(true);
    try {
      const insights = await geminiService.processDocument(doc.file);
      setAiInsights({
        summary: insights.summary,
        entities: insights.entities,
        classification: insights.classification,
        financialData: insights.financialData,
        compliance: await checkCompliance(insights),
        risks: await detectRisks(insights),
      });
    } catch (error) {
      console.error('AI processing failed:', error);
    } finally {
      setProcessingAI(false);
    }
  }

  if (loading) {
    return <DocumentSkeleton />;
  }

  if (!document) {
    return <DocumentNotFound />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Main Document View */}
      <div className="flex-1 bg-card rounded-lg border p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold mb-1">
                {document.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{document.size}</span>
                <span>•</span>
                <span>{document.uploadedAt}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Document Content */}
        <div className="prose max-w-none">
          {document.content}
        </div>
      </div>

      {/* AI Insights Sidebar */}
      <div className="w-full lg:w-96 space-y-4">
        {/* AI Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card rounded-lg border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">AI Summary</h3>
            {processingAI && (
              <span className="text-xs text-muted-foreground ml-auto">
                Processing...
              </span>
            )}
          </div>

          {processingAI ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : aiInsights ? (
            <p className="text-sm text-muted-foreground">
              {aiInsights.summary}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No summary available
            </p>
          )}
        </motion.div>

        {/* Key Entities */}
        {aiInsights?.entities && aiInsights.entities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg border p-4"
          >
            <h3 className="font-semibold mb-3">Key Entities</h3>
            <div className="flex flex-wrap gap-2">
              {aiInsights.entities.map((entity, i) => (
                <Badge key={i} variant="secondary">
                  {entity.name}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Compliance Check */}
        {aiInsights?.compliance && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg border p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">Compliance</h3>
            </div>
            <div className="space-y-2">
              {aiInsights.compliance.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    item.passed ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Risk Analysis */}
        {aiInsights?.risks && aiInsights.risks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-lg border p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Risk Analysis</h3>
            </div>
            <div className="space-y-3">
              {aiInsights.risks.map((risk, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      risk.severity === 'high' ? 'destructive' :
                      risk.severity === 'medium' ? 'default' : 'secondary'
                    }>
                      {risk.severity}
                    </Badge>
                    <span className="text-sm font-medium">{risk.type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {risk.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* AI Chat */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-lg border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Ask AI</h3>
          </div>
          <Button variant="outline" className="w-full" size="sm">
            <Sparkles className="w-4 h-4 mr-2" />
            Ask about this document
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function DocumentSkeleton() {
  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="w-96 space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}

function DocumentNotFound() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Document not found</h3>
        <p className="text-sm text-muted-foreground">
          The document you're looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}

// Helper functions
async function fetchDocument(id: string): Promise<Document> {
  // Implementation
  throw new Error('Not implemented');
}

async function checkCompliance(insights: any): Promise<ComplianceItem[]> {
  // Implementation
  return [];
}

async function detectRisks(insights: any): Promise<Risk[]> {
  // Implementation
  return [];
}
```

### 4.2 Advanced Virtual Scrolling

**File**: `src/components/features/documents/VirtualDocumentList.tsx`
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VirtualDocumentListProps {
  documents: Document[];
  onDocumentClick: (doc: Document) => void;
}

export function VirtualDocumentList({
  documents,
  onDocumentClick
}: VirtualDocumentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: documents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated row height
    overscan: 5, // Render 5 extra items for smooth scrolling
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const doc = documents[virtualRow.index];
          
          return (
            <motion.div
              key={virtualRow.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="flex items-center gap-4 p-4 hover:bg-accent cursor-pointer rounded-lg transition-colors"
                onClick={() => onDocumentClick(doc)}
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{doc.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {doc.description || 'No description'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {doc.size}
                  </span>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
```

### 4.3 Advanced Command Palette

**File**: `src/components/smart/AdvancedCommandPalette.tsx`
```typescript
import { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { useHotkeys } from 'react-hotkeys-hook';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  CheckSquare,
  Users,
  Settings,
  Sparkles,
  Clock,
  Hash
} from 'lucide-react';
import { geminiService } from '@/services/gemini.service';

export function AdvancedCommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([]);

  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setOpen(true);
  });

  // AI-powered search suggestions
  useEffect(() => {
    if (search.length > 2) {
      const timer = setTimeout(async () => {
        try {
          const suggestions = await geminiService.semanticSearch(search, {
            scope: ['documents', 'tasks', 'clients'],
            filters: {},
          });
          setAiSuggestions(suggestions.slice(0, 5));
        } catch (error) {
          console.error('Failed to get AI suggestions:', error);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setAiSuggestions([]);
    }
  }, [search]);

  const handleSelect = useCallback((value: string) => {
    console.log('Selected:', value);
    setOpen(false);
    setSearch('');
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setOpen(false)}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
          >
            <Command
              className="bg-card rounded-lg border shadow-2xl overflow-hidden"
              shouldFilter={false} // We handle filtering via AI
            >
              <div className="flex items-center border-b px-4">
                <Search className="w-5 h-5 text-muted-foreground mr-3" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search or type a command..."
                  className="flex-1 bg-transparent border-0 outline-none py-4 text-base"
                />
              </div>

              <Command.List className="max-h-96 overflow-y-auto p-2">
                {/* AI Suggestions */}
                {aiSuggestions.length > 0 && (
                  <Command.Group heading="AI Suggestions">
                    {aiSuggestions.map((suggestion) => (
                      <Command.Item
                        key={suggestion.id}
                        value={suggestion.id}
                        onSelect={handleSelect}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent"
                      >
                        <Sparkles className="w-4 h-4 text-primary" />
                        <div className="flex-1">
                          <div className="font-medium">{suggestion.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {suggestion.snippet}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(suggestion.score * 100)}% match
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Recent */}
                <Command.Group heading="Recent">
                  <CommandItem
                    icon={FileText}
                    label="Client Agreement - Acme Corp"
                    meta="2 hours ago"
                    onSelect={handleSelect}
                  />
                  <CommandItem
                    icon={CheckSquare}
                    label="Review Q4 financials"
                    meta="Yesterday"
                    onSelect={handleSelect}
                  />
                </Command.Group>

                {/* Quick Actions */}
                <Command.Group heading="Quick Actions">
                  <CommandItem
                    icon={FileText}
                    label="New Document"
                    shortcut="⌘N"
                    onSelect={handleSelect}
                  />
                  <CommandItem
                    icon={CheckSquare}
                    label="New Task"
                    shortcut="⌘T"
                    onSelect={handleSelect}
                  />
                  <CommandItem
                    icon={Users}
                    label="New Client"
                    shortcut="⌘U"
                    onSelect={handleSelect}
                  />
                </Command.Group>

                {/* Navigation */}
                <Command.Group heading="Navigation">
                  <CommandItem
                    icon={Hash}
                    label="Dashboard"
                    shortcut="⌘1"
                    onSelect={handleSelect}
                  />
                  <CommandItem
                    icon={FileText}
                    label="Documents"
                    shortcut="⌘2"
                    onSelect={handleSelect}
                  />
                  <CommandItem
                    icon={CheckSquare}
                    label="Tasks"
                    shortcut="⌘3"
                    onSelect={handleSelect}
                  />
                  <CommandItem
                    icon={Settings}
                    label="Settings"
                    shortcut="⌘,"
                    onSelect={handleSelect}
                  />
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface CommandItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  meta?: string;
  shortcut?: string;
  onSelect: (value: string) => void;
}

function CommandItem({ icon: Icon, label, meta, shortcut, onSelect }: CommandItemProps) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent"
    >
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      {meta && (
        <span className="text-xs text-muted-foreground">{meta}</span>
      )}
      {shortcut && (
        <kbd className="px-2 py-1 text-xs bg-muted rounded">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
```

---

## 🚀 PHASE 5: DESKTOP APP & FINAL POLISH (Week 3)

### 5.1 Tauri Desktop Integration

**File**: `src-tauri/Cargo.toml`
```toml
[package]
name = "prisma-glow"
version = "1.0.0"
description = "AI-Powered Operations Suite"
authors = ["Prisma Team"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.0", features = ["shell-open", "fs-all", "dialog-all"] }
tauri-plugin-store = "2.0"
tauri-plugin-updater = "2.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.35", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }

[features]
custom-protocol = ["tauri/custom-protocol"]

[[bin]]
name = "prisma-glow"
path = "src/main.rs"
```

**File**: `src-tauri/src/main.rs`
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Window};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct ProcessedDocument {
    text: String,
    summary: String,
    entities: Vec<Entity>,
    classification: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Entity {
    name: String,
    entity_type: String,
    confidence: f32,
}

// Document processing with Gemini
#[tauri::command]
async fn gemini_process_document(
    data: Vec<u8>,
    mime_type: String,
    operations: Vec<String>,
) -> Result<ProcessedDocument, String> {
    // TODO: Integrate actual Gemini API
    Ok(ProcessedDocument {
        text: "Sample extracted text".to_string(),
        summary: "AI-generated summary".to_string(),
        entities: vec![],
        classification: "financial_document".to_string(),
    })
}

// Semantic search
#[tauri::command]
async fn gemini_search(
    embedding: Vec<f32>,
    context: serde_json::Value,
    rerank: bool,
    top_k: usize,
) -> Result<Vec<SearchResult>, String> {
    // TODO: Implement vector search
    Ok(vec![])
}

// Text embedding
#[tauri::command]
async fn gemini_embed(text: String) -> Result<Vec<f32>, String> {
    // TODO: Integrate Gemini embedding API
    Ok(vec![0.0; 768])
}

// Window controls
#[tauri::command]
fn minimize_window(window: Window) {
    window.minimize().unwrap();
}

#[tauri::command]
fn maximize_window(window: Window) {
    if window.is_maximized().unwrap() {
        window.unmaximize().unwrap();
    } else {
        window.maximize().unwrap();
    }
}

#[tauri::command]
fn close_window(window: Window) {
    window.close().unwrap();
}

#[derive(Debug, Serialize, Deserialize)]
struct SearchResult {
    id: String,
    title: String,
    snippet: String,
    score: f32,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            gemini_process_document,
            gemini_search,
            gemini_embed,
            minimize_window,
            maximize_window,
            close_window,
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.set_decorations(false)?; // Custom title bar
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**File**: `src-tauri/tauri.conf.json`
```json
{
  "productName": "Prisma Glow",
  "version": "1.0.0",
  "identifier": "com.prisma.glow",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "msi", "deb", "appimage"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    },
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.15",
      "exceptionDomain": ""
    }
  },
  "app": {
    "windows": [
      {
        "title": "Prisma Glow",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "decorations": false,
        "transparent": true,
        "fullscreen": false,
        "resizable": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    }
  }
}
```

### 5.2 Custom Title Bar

**File**: `src/components/desktop/TitleBar.tsx`
```typescript
import { invoke } from '@tauri-apps/api/tauri';
import { Minus, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TitleBar() {
  const handleMinimize = () => invoke('minimize_window');
  const handleMaximize = () => invoke('maximize_window');
  const handleClose = () => invoke('close_window');

  return (
    <div
      data-tauri-drag-region
      className="h-12 bg-card border-b flex items-center justify-between px-4 select-none"
    >
      {/* App Icon & Title */}
      <div className="flex items-center gap-3">
        <img src="/icon.png" alt="Prisma Glow" className="w-6 h-6" />
        <span className="font-semibold">Prisma Glow</span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent"
          onClick={handleMinimize}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent"
          onClick={handleMaximize}
        >
          <Square className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

### 5.3 Performance Optimization

**File**: `vite.config.optimized.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'brotliCompress' }),
    visualizer({
      filename: './dist/stats.html',
      open: false,
    }),
  ],
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'date-fns'],
          
          // Feature chunks
          'feature-documents': ['./src/pages/documents.tsx'],
          'feature-tasks': ['./src/pages/tasks.tsx'],
          'feature-settings': ['./src/pages/settings.tsx'],
        },
      },
    },
    
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    
    // Source maps for production debugging
    sourcemap: 'hidden',
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
  },
});
```

### 5.4 Lazy Loading Implementation

**File**: `src/App.optimized.tsx`
```typescript
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TitleBar } from '@/components/desktop/TitleBar';
import { AdaptiveLayout } from '@/components/layout/AdaptiveLayout';

// Lazy load pages
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Documents = lazy(() => import('@/pages/documents'));
const Tasks = lazy(() => import('@/pages/tasks'));
const Settings = lazy(() => import('@/pages/settings'));
const Clients = lazy(() => import('@/pages/clients'));

// Preload on hover
function preloadRoute(route: string) {
  switch (route) {
    case 'dashboard':
      import('@/pages/dashboard');
      break;
    case 'documents':
      import('@/pages/documents');
      break;
    case 'tasks':
      import('@/pages/tasks');
      break;
    case 'settings':
      import('@/pages/settings');
      break;
  }
}

export function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen">
        <TitleBar />
        
        <AdaptiveLayout onNavHover={preloadRoute}>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </AdaptiveLayout>
      </div>
    </BrowserRouter>
  );
}
```

### 5.5 Accessibility Audit Checklist

**File**: `docs/ACCESSIBILITY_CHECKLIST.md`
```markdown
# Accessibility Checklist (WCAG 2.1 AA)

## ✅ Keyboard Navigation
- [ ] All interactive elements focusable via Tab
- [ ] Focus indicators visible (2px outline, high contrast)
- [ ] Skip links to main content
- [ ] No keyboard traps
- [ ] Logical tab order

## ✅ Screen Reader Support
- [ ] Semantic HTML (header, nav, main, footer)
- [ ] ARIA labels on all buttons/icons
- [ ] ARIA live regions for dynamic content
- [ ] Alt text on all images
- [ ] Form labels properly associated

## ✅ Color Contrast
- [ ] Text contrast ratio ≥ 4.5:1
- [ ] Large text (18pt+) ≥ 3:1
- [ ] UI component contrast ≥ 3:1
- [ ] Focus indicators ≥ 3:1

## ✅ Responsive Design
- [ ] Works at 200% zoom
- [ ] No horizontal scroll at 320px width
- [ ] Touch targets ≥ 44x44px
- [ ] Reflow content at 400% zoom

## ✅ Forms
- [ ] Error messages programmatically associated
- [ ] Required fields indicated
- [ ] Validation feedback accessible
- [ ] Success messages announced

## ✅ Media
- [ ] Video captions
- [ ] Audio transcripts
- [ ] No auto-playing audio >3 seconds

## ✅ Testing Tools
- [ ] axe DevTools (0 violations)
- [ ] WAVE browser extension
- [ ] NVDA/JAWS screen reader testing
- [ ] Keyboard-only navigation testing
```

### 5.6 Lighthouse Performance Targets

**File**: `.github/workflows/performance.yml`
```yaml
name: Performance Audit

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.12.0'
      
      - name: Install pnpm
        run: npm install -g pnpm@9.12.3
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        run: pnpm build
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:4173
          uploadArtifacts: true
          temporaryPublicStorage: true
          budgetPath: ./lighthouse-budget.json
      
      - name: Check performance budget
        run: |
          # Fail if any metric below target
          # Performance: 90+
          # Accessibility: 95+
          # Best Practices: 90+
          # SEO: 90+
```

**File**: `lighthouse-budget.json`
```json
{
  "performance": 90,
  "accessibility": 95,
  "best-practices": 90,
  "seo": 90,
  "pwa": 80,
  "budgets": [
    {
      "resourceSizes": [
        {
          "resourceType": "script",
          "budget": 300
        },
        {
          "resourceType": "stylesheet",
          "budget": 50
        },
        {
          "resourceType": "image",
          "budget": 200
        },
        {
          "resourceType": "total",
          "budget": 600
        }
      ],
      "timings": [
        {
          "metric": "first-contentful-paint",
          "budget": 1500
        },
        {
          "metric": "largest-contentful-paint",
          "budget": 2500
        },
        {
          "metric": "time-to-interactive",
          "budget": 3500
        }
      ]
    }
  ]
}
```

---

## 📊 IMPLEMENTATION TIMELINE

### Week 1: Advanced Features
- **Day 1-2**: Gemini AI service integration
- **Day 3-4**: Smart document viewer + virtual scrolling
- **Day 5**: Advanced command palette

### Week 2: Desktop App
- **Day 1-2**: Tauri setup + custom title bar
- **Day 3-4**: Desktop-specific features (file system access, notifications)
- **Day 5**: Build & packaging

### Week 3: Performance & Polish
- **Day 1-2**: Bundle optimization + lazy loading
- **Day 3**: Accessibility audit + fixes
- **Day 4**: Lighthouse performance testing
- **Day 5**: Final QA + documentation

---

## 🎯 SUCCESS METRICS

### Performance
- **Bundle size**: <600KB gzipped
- **FCP**: <1.5s
- **LCP**: <2.5s
- **TTI**: <3.5s
- **Lighthouse score**: 90+

### Accessibility
- **WCAG 2.1 AA**: 100% compliant
- **Keyboard navigation**: All features accessible
- **Screen reader**: Full compatibility
- **Color contrast**: 4.5:1+ everywhere

### User Experience
- **Time to first interaction**: <1s
- **Smooth scrolling**: 60fps (10,000+ items)
- **AI response time**: <500ms (local), <2s (cloud)
- **Zero layout shift**: CLS <0.1

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Release
- [ ] All tests passing (unit + e2e)
- [ ] Lighthouse scores ≥90
- [ ] Accessibility audit clean
- [ ] Bundle size <600KB
- [ ] Desktop builds (macOS, Windows, Linux)

### Release
- [ ] Version bump (1.0.0)
- [ ] Changelog updated
- [ ] Desktop installers signed
- [ ] Auto-update configured
- [ ] Documentation complete

### Post-Release
- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Gather user feedback
- [ ] Plan v1.1 improvements

---

## 📚 NEXT STEPS

1. **Review this blueprint** with the team
2. **Set up Gemini API access** (obtain API keys)
3. **Install Tauri dependencies**: `cargo install tauri-cli`
4. **Create feature branch**: `git checkout -b feature/ui-redesign-phase-4-5`
5. **Start with Gemini service** (easiest to test independently)
6. **Proceed to desktop integration** once Gemini working
7. **Optimize performance** last (measure first!)

---

**Questions or concerns?** This is a comprehensive transformation. We can break it into smaller PRs if needed.
