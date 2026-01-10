/**
 * Playbook Service
 * 
 * Loads and applies jurisdiction playbooks to generate
 * engagement plans (tasks, document requests, workpapers).
 */

import { loadPlaybook, JURISDICTIONS, ENGAGEMENT_TYPES } from '@prisma/config';
import type { Playbook, Phase, TaskTemplate, DocRequestTemplate } from '@prisma/config';
import type { Jurisdiction, EngagementType, EngagementPhase } from '@prisma/db';

// ============================================================================
// TYPES
// ============================================================================

export interface AutoplanInput {
    engagementId: string;
    clientId: string;
    firmId: string;
    jurisdiction: Jurisdiction;
    engagementType: EngagementType;
    periodStart: string;
    periodEnd: string;
    options?: {
        skipOptionalTasks?: boolean;
        assignManagerId?: string;
        assignPartnerId?: string;
    };
}

export interface AutoplanResult {
    success: boolean;
    engagementId: string;
    playbook: {
        id: string;
        name: string;
        version: string;
    };
    generated: {
        tasks: GeneratedTask[];
        documentRequests: GeneratedDocRequest[];
        workpapers: GeneratedWorkpaper[];
        phases: GeneratedPhase[];
    };
    summary: {
        totalTasks: number;
        totalDocRequests: number;
        totalWorkpapers: number;
        estimatedHours: number;
    };
    generatedAt: string;
}

export interface GeneratedTask {
    id: string;
    templateKey: string;
    title: string;
    description: string;
    phase: EngagementPhase;
    assignedRole: string;
    estimatedHours: number;
    dependencies: string[];
    status: 'pending';
}

export interface GeneratedDocRequest {
    id: string;
    docType: string;
    description: string;
    phase: EngagementPhase;
    required: boolean;
}

export interface GeneratedWorkpaper {
    id: string;
    wpType: string;
    title: string;
    phase: EngagementPhase;
    status: 'draft';
}

export interface GeneratedPhase {
    id: string;
    name: string;
    order: number;
    reviewGate: string | null;
    taskCount: number;
}

// ============================================================================
// PLAYBOOK SERVICE
// ============================================================================

export class PlaybookService {
    private playbookCache = new Map<string, Playbook>();

    /**
     * Get playbook for jurisdiction + engagement type
     */
    getPlaybook(jurisdiction: Jurisdiction, engagementType: EngagementType): Playbook {
        const cacheKey = `${jurisdiction}-${engagementType}`;

        if (!this.playbookCache.has(cacheKey)) {
            const playbook = loadPlaybook(jurisdiction, engagementType);
            this.playbookCache.set(cacheKey, playbook);
        }

        return this.playbookCache.get(cacheKey)!;
    }

    /**
     * Generate full engagement plan from playbook
     */
    async generatePlan(input: AutoplanInput): Promise<AutoplanResult> {
        const {
            engagementId,
            jurisdiction,
            engagementType,
            options = {}
        } = input;

        // Load playbook
        const playbook = this.getPlaybook(jurisdiction, engagementType);

        // Generate tasks from templates
        const tasks = this.generateTasks(playbook, options.skipOptionalTasks);

        // Generate document requests
        const documentRequests = this.generateDocRequests(playbook);

        // Generate mandatory workpapers
        const workpapers = this.generateWorkpapers(playbook);

        // Build phase summary
        const phases = this.generatePhases(playbook, tasks);

        // Calculate totals
        const estimatedHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

        return {
            success: true,
            engagementId,
            playbook: {
                id: `${jurisdiction}-${engagementType}-${playbook.version}`,
                name: `${jurisdiction} ${engagementType.charAt(0).toUpperCase() + engagementType.slice(1)} Playbook`,
                version: playbook.version,
            },
            generated: {
                tasks,
                documentRequests,
                workpapers,
                phases,
            },
            summary: {
                totalTasks: tasks.length,
                totalDocRequests: documentRequests.length,
                totalWorkpapers: workpapers.length,
                estimatedHours,
            },
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Generate tasks from playbook templates
     */
    private generateTasks(playbook: Playbook, skipOptional = false): GeneratedTask[] {
        const tasks: GeneratedTask[] = [];

        for (const template of playbook.taskTemplates) {
            if (skipOptional && template.optional) {
                continue;
            }

            tasks.push({
                id: crypto.randomUUID(),
                templateKey: template.id,
                title: template.title,
                description: template.description,
                phase: template.phaseId as EngagementPhase,
                assignedRole: template.assigneeRole,
                estimatedHours: template.estimatedHours,
                dependencies: template.dependencies,
                status: 'pending',
            });
        }

        return tasks;
    }

    /**
     * Generate document requests from playbook
     */
    private generateDocRequests(playbook: Playbook): GeneratedDocRequest[] {
        return playbook.docRequestTemplates.map(template => ({
            id: crypto.randomUUID(),
            docType: template.docType,
            description: template.description,
            phase: template.phaseId as EngagementPhase,
            required: template.required,
        }));
    }

    /**
     * Generate mandatory workpapers from playbook
     */
    private generateWorkpapers(playbook: Playbook): GeneratedWorkpaper[] {
        return playbook.mandatoryWorkpapers.map(wpType => ({
            id: crypto.randomUUID(),
            wpType,
            title: this.formatWorkpaperTitle(wpType),
            phase: this.getWorkpaperPhase(wpType, playbook),
            status: 'draft' as const,
        }));
    }

    /**
     * Generate phase summary with task counts
     */
    private generatePhases(playbook: Playbook, tasks: GeneratedTask[]): GeneratedPhase[] {
        return playbook.phases.map(phase => ({
            id: phase.id,
            name: phase.name,
            order: phase.order,
            reviewGate: phase.reviewGate,
            taskCount: tasks.filter(t => t.phase === phase.id).length,
        }));
    }

    /**
     * Format workpaper type to readable title
     */
    private formatWorkpaperTitle(wpType: string): string {
        return wpType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Determine which phase a workpaper belongs to
     */
    private getWorkpaperPhase(wpType: string, playbook: Playbook): EngagementPhase {
        const planningWps = ['engagement_letter', 'risk_assessment', 'materiality_memo', 'audit_strategy', 'planning_memo'];
        const completionWps = ['misstatement_summary', 'audit_report', 'financial_statements', 'tax_return_draft'];

        if (planningWps.includes(wpType)) return 'planning';
        if (completionWps.includes(wpType)) return 'completion';
        return 'fieldwork';
    }
}

// Export singleton
export const playbookService = new PlaybookService();
