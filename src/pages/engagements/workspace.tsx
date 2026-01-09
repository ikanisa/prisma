/**
 * Engagement Workspace
 * 
 * Main workspace for a single engagement showing:
 * - Phase progress
 * - Tasks with dependencies
 * - Documents
 * - Workpapers
 * - Agent chat interface
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Briefcase,
    CheckCircle2,
    Circle,
    Clock,
    FileText,
    FolderOpen,
    Loader2,
    MessageSquare,
    Play,
    AlertTriangle,
    ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================================================
// TYPES
// ============================================================================

interface Engagement {
    id: string;
    name: string;
    clientName: string;
    type: 'accounting' | 'audit' | 'tax';
    jurisdiction: 'RW' | 'MT' | 'CA';
    phase: 'planning' | 'fieldwork' | 'completion' | 'archived';
    status: 'active' | 'on_hold' | 'completed';
    periodStart: string;
    periodEnd: string;
    progress: number;
}

interface Task {
    id: string;
    title: string;
    phase: string;
    status: 'pending' | 'in_progress' | 'review' | 'completed' | 'blocked';
    assignedRole: string;
    estimatedHours: number;
}

interface Document {
    id: string;
    fileName: string;
    docType: string;
    status: 'uploaded' | 'processing' | 'extracted' | 'failed';
    uploadedAt: string;
}

interface Workpaper {
    id: string;
    wpRef: string;
    title: string;
    wpType: string;
    status: 'draft' | 'review' | 'approved';
}

// ============================================================================
// DEMO DATA
// ============================================================================

const DEMO_ENGAGEMENT: Engagement = {
    id: '44444444-4444-4444-4444-444444444441',
    name: '2025 Annual Audit',
    clientName: 'Kigali Tech Solutions Ltd',
    type: 'audit',
    jurisdiction: 'RW',
    phase: 'planning',
    status: 'active',
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    progress: 25,
};

const DEMO_TASKS: Task[] = [
    { id: '1', title: 'Engagement Acceptance', phase: 'planning', status: 'completed', assignedRole: 'MANAGER', estimatedHours: 2 },
    { id: '2', title: 'Engagement Planning Memo', phase: 'planning', status: 'in_progress', assignedRole: 'STAFF', estimatedHours: 4 },
    { id: '3', title: 'Risk Assessment (ISA 315)', phase: 'planning', status: 'pending', assignedRole: 'STAFF', estimatedHours: 6 },
    { id: '4', title: 'Materiality Calculation', phase: 'planning', status: 'pending', assignedRole: 'STAFF', estimatedHours: 2 },
    { id: '5', title: 'Tests of Controls', phase: 'fieldwork', status: 'blocked', assignedRole: 'STAFF', estimatedHours: 8 },
    { id: '6', title: 'Substantive Procedures', phase: 'fieldwork', status: 'pending', assignedRole: 'STAFF', estimatedHours: 16 },
    { id: '7', title: 'Manager Review', phase: 'completion', status: 'pending', assignedRole: 'MANAGER', estimatedHours: 4 },
    { id: '8', title: 'Partner Sign-off', phase: 'completion', status: 'pending', assignedRole: 'ADMIN', estimatedHours: 2 },
];

const DEMO_DOCUMENTS: Document[] = [
    { id: '1', fileName: 'Trial_Balance_2025.xlsx', docType: 'trial_balance', status: 'extracted', uploadedAt: '2025-01-15' },
    { id: '2', fileName: 'Bank_Statement_Jan.pdf', docType: 'bank_statement', status: 'processing', uploadedAt: '2025-01-16' },
    { id: '3', fileName: 'Prior_Year_FS.pdf', docType: 'prior_year_fs', status: 'uploaded', uploadedAt: '2025-01-17' },
];

const DEMO_WORKPAPERS: Workpaper[] = [
    { id: '1', wpRef: 'A-1', title: 'Engagement Letter', wpType: 'engagement_letter', status: 'approved' },
    { id: '2', wpRef: 'B-1', title: 'Planning Memorandum', wpType: 'planning_memo', status: 'draft' },
    { id: '3', wpRef: 'C-1', title: 'Risk Assessment', wpType: 'risk_assessment', status: 'draft' },
    { id: '4', wpRef: 'C-2', title: 'Materiality Calculation', wpType: 'materiality_memo', status: 'draft' },
];

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-purple-100 text-purple-700',
    completed: 'bg-emerald-100 text-emerald-700',
    blocked: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-700',
    approved: 'bg-emerald-100 text-emerald-700',
    uploaded: 'bg-gray-100 text-gray-700',
    processing: 'bg-amber-100 text-amber-700',
    extracted: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
};

const PHASE_ORDER = ['planning', 'fieldwork', 'completion'];

// ============================================================================
// COMPONENT
// ============================================================================

export function EngagementWorkspace() {
    const { engagementId } = useParams<{ engagementId: string }>();
    const [loading, setLoading] = useState(true);
    const [engagement, setEngagement] = useState<Engagement | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [workpapers, setWorkpapers] = useState<Workpaper[]>([]);

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setEngagement(DEMO_ENGAGEMENT);
            setTasks(DEMO_TASKS);
            setDocuments(DEMO_DOCUMENTS);
            setWorkpapers(DEMO_WORKPAPERS);
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [engagementId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!engagement) {
        return <div>Engagement not found</div>;
    }

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const progressPercent = Math.round((completedTasks / totalTasks) * 100);

    const tasksByPhase = PHASE_ORDER.map(phase => ({
        phase,
        tasks: tasks.filter(t => t.phase === phase),
        completed: tasks.filter(t => t.phase === phase && t.status === 'completed').length,
        total: tasks.filter(t => t.phase === phase).length,
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Link to="/engagements" className="hover:text-primary">Engagements</Link>
                        <ChevronRight className="h-4 w-4" />
                        <span>{engagement.clientName}</span>
                    </div>
                    <h1 className="text-3xl font-bold gradient-text">{engagement.name}</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline">{engagement.jurisdiction}</Badge>
                        <Badge variant="outline" className="capitalize">{engagement.type}</Badge>
                        <Badge className={
                            engagement.phase === 'planning' ? 'bg-blue-100 text-blue-700' :
                                engagement.phase === 'fieldwork' ? 'bg-purple-100 text-purple-700' :
                                    'bg-emerald-100 text-emerald-700'
                        }>
                            {engagement.phase.charAt(0).toUpperCase() + engagement.phase.slice(1)}
                        </Badge>
                    </div>
                </div>
                <Button variant="gradient" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Ask Agent
                </Button>
            </div>

            {/* Progress Overview */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Overall Progress</span>
                        <span className="text-sm text-muted-foreground">{completedTasks}/{totalTasks} tasks</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        {tasksByPhase.map(({ phase, completed, total }) => (
                            <div key={phase} className="text-center">
                                <div className="text-xs uppercase text-muted-foreground mb-1">{phase}</div>
                                <div className="text-lg font-semibold">{completed}/{total}</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="tasks" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="tasks" className="gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Tasks
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Documents
                    </TabsTrigger>
                    <TabsTrigger value="workpapers" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Workpapers
                    </TabsTrigger>
                </TabsList>

                {/* Tasks Tab */}
                <TabsContent value="tasks">
                    <div className="space-y-4">
                        {tasksByPhase.map(({ phase, tasks: phaseTasks }) => (
                            <Card key={phase}>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-base capitalize flex items-center gap-2">
                                        {phase === engagement.phase && <Play className="h-4 w-4 text-primary" />}
                                        {phase}
                                        <Badge variant="outline" className="ml-auto">
                                            {phaseTasks.filter(t => t.status === 'completed').length}/{phaseTasks.length}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-0 pb-3">
                                    <div className="space-y-2">
                                        {phaseTasks.map(task => (
                                            <div
                                                key={task.id}
                                                className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {task.status === 'completed' ? (
                                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                    ) : task.status === 'blocked' ? (
                                                        <AlertTriangle className="h-5 w-5 text-red-500" />
                                                    ) : task.status === 'in_progress' ? (
                                                        <Clock className="h-5 w-5 text-blue-500" />
                                                    ) : (
                                                        <Circle className="h-5 w-5 text-gray-300" />
                                                    )}
                                                    <span className={task.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                                                        {task.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">{task.assignedRole}</Badge>
                                                    <Badge className={STATUS_COLORS[task.status]}>{task.status.replace('_', ' ')}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Documents</CardTitle>
                                <Button variant="outline" size="sm">
                                    Upload Document
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[300px]">
                                <div className="space-y-2">
                                    {documents.map(doc => (
                                        <div
                                            key={doc.id}
                                            className="flex items-center justify-between p-3 rounded-lg border"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium">{doc.fileName}</p>
                                                    <p className="text-xs text-muted-foreground">{doc.docType} • {doc.uploadedAt}</p>
                                                </div>
                                            </div>
                                            <Badge className={STATUS_COLORS[doc.status]}>{doc.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Workpapers Tab */}
                <TabsContent value="workpapers">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Workpapers</CardTitle>
                                <Button variant="outline" size="sm">
                                    New Workpaper
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[300px]">
                                <div className="space-y-2">
                                    {workpapers.map(wp => (
                                        <div
                                            key={wp.id}
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <span className="font-mono font-bold text-primary">{wp.wpRef}</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium">{wp.title}</p>
                                                    <p className="text-xs text-muted-foreground">{wp.wpType}</p>
                                                </div>
                                            </div>
                                            <Badge className={STATUS_COLORS[wp.status]}>{wp.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}

export default EngagementWorkspace;
