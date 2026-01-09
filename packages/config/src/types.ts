/**
 * Playbook types for engagement configuration
 */

export interface Playbook {
    jurisdiction: 'RW' | 'MT' | 'CA';
    engagementType: 'accounting' | 'audit' | 'tax';
    version: string;
    phases: Phase[];
    taskTemplates: TaskTemplate[];
    docRequestTemplates: DocRequestTemplate[];
    mandatoryWorkpapers: string[];
}

export interface Phase {
    id: string;
    name: string;
    order: number;
    reviewGate: 'MANAGER' | 'PARTNER' | 'EQR' | null;
    requiredForCompletion: boolean;
}

export interface TaskTemplate {
    id: string;
    phaseId: string;
    title: string;
    description: string;
    assigneeRole: 'STAFF' | 'MANAGER' | 'PARTNER';
    estimatedHours: number;
    dependencies: string[];
}

export interface DocRequestTemplate {
    id: string;
    docType: string;
    description: string;
    required: boolean;
    phaseId: string;
}
