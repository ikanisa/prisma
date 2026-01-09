/**
 * Prisma Core Database Types
 * 
 * Core types for the engagement system.
 * Full generated types will come from Supabase CLI.
 */

// Supported jurisdictions
export type Jurisdiction = 'RW' | 'MT' | 'CA';

// Supported engagement types
export type EngagementType = 'accounting' | 'audit' | 'tax';

// Client segments
export type ClientSegment = 'self_employed' | 'micro' | 'small' | 'medium';

// Engagement phases
export type EngagementPhase = 'planning' | 'fieldwork' | 'completion' | 'archived';

// Task status
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'blocked';

// Document status
export type DocumentStatus = 'uploaded' | 'processing' | 'extracted' | 'failed';

// Workpaper status
export type WorkpaperStatus = 'draft' | 'review' | 'approved' | 'rejected';

// Approval decision
export type ApprovalDecision = 'pending' | 'approved' | 'rejected' | 'needs_revision';

// Role types
export type OrgRole = 'ADMIN' | 'MANAGER' | 'STAFF';
export type ReviewStage = 'MANAGER' | 'PARTNER' | 'EQR';

// Placeholder for generated types
export interface Database {
    public: {
        Tables: {
            firms: {
                Row: {
                    id: string;
                    name: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['firms']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['firms']['Insert']>;
            };
            clients: {
                Row: {
                    id: string;
                    firm_id: string;
                    name: string;
                    jurisdiction: Jurisdiction;
                    client_segment: ClientSegment;
                    entity_type: string | null;
                    industry_code: string | null;
                    is_financial_institution: boolean;
                    eligibility_status: 'eligible' | 'ineligible' | 'pending';
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['clients']['Insert']>;
            };
            engagements: {
                Row: {
                    id: string;
                    client_id: string;
                    type: EngagementType;
                    period_start: string;
                    period_end: string;
                    status: string;
                    phase: EngagementPhase;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['engagements']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['engagements']['Insert']>;
            };
            tasks: {
                Row: {
                    id: string;
                    engagement_id: string;
                    title: string;
                    status: TaskStatus;
                    assigned_to: string | null;
                    due_date: string | null;
                    template_key: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
            };
            documents: {
                Row: {
                    id: string;
                    engagement_id: string;
                    storage_path: string;
                    doc_type: string;
                    status: DocumentStatus;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['documents']['Insert']>;
            };
            agent_runs: {
                Row: {
                    id: string;
                    engagement_id: string;
                    agent_type: EngagementType;
                    trace_id: string;
                    status: 'running' | 'completed' | 'failed';
                    started_at: string;
                    completed_at: string | null;
                };
                Insert: Omit<Database['public']['Tables']['agent_runs']['Row'], 'id' | 'started_at'>;
                Update: Partial<Database['public']['Tables']['agent_runs']['Insert']>;
            };
            agent_events: {
                Row: {
                    id: string;
                    run_id: string;
                    event_type: string;
                    payload_json: Record<string, unknown>;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['agent_events']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['agent_events']['Insert']>;
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: {
            jurisdiction: Jurisdiction;
            engagement_type: EngagementType;
            client_segment: ClientSegment;
        };
    };
}
