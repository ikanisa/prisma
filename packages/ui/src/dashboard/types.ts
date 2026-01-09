/**
 * Dashboard Data Types
 * 
 * Type definitions for executive dashboards, KPIs, and data visualization.
 */

// ============================================================================
// KPI TYPES
// ============================================================================

export interface KPIMetric {
    id: string;
    label: string;
    value: number;
    previousValue?: number;
    format: 'number' | 'currency' | 'percent' | 'duration';
    trend?: 'up' | 'down' | 'stable';
    trendValue?: number;
    target?: number;
    status?: 'good' | 'warning' | 'critical';
    sparklineData?: number[];
}

export interface KPICardProps {
    metric: KPIMetric;
    size?: 'sm' | 'md' | 'lg';
    showTrend?: boolean;
    showSparkline?: boolean;
    onClick?: () => void;
}

// ============================================================================
// CHART TYPES
// ============================================================================

export interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
    metadata?: Record<string, unknown>;
}

export interface TimeSeriesDataPoint {
    date: Date;
    value: number;
    category?: string;
}

export interface ChartConfig {
    type: 'line' | 'bar' | 'area' | 'pie' | 'donut';
    title?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showLegend?: boolean;
    showGrid?: boolean;
    animate?: boolean;
    colors?: string[];
}

// ============================================================================
// RISK HEATMAP TYPES
// ============================================================================

export interface RiskCell {
    id: string;
    label: string;
    value: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    subCategory?: string;
    details?: string;
    link?: string;
}

export interface RiskHeatmapProps {
    data: RiskCell[];
    rows: string[];     // Y-axis categories
    columns: string[];  // X-axis categories
    title?: string;
    onCellClick?: (cell: RiskCell) => void;
}

// ============================================================================
// ENGAGEMENT STATUS
// ============================================================================

export type EngagementPhase =
    | 'planning'
    | 'fieldwork'
    | 'review'
    | 'reporting'
    | 'completed'
    | 'on_hold';

export interface EngagementStatus {
    id: string;
    name: string;
    clientName: string;
    phase: EngagementPhase;
    progress: number;           // 0-100
    dueDate: Date;
    daysRemaining: number;
    team: { id: string; name: string; role: string }[];
    riskLevel: 'low' | 'medium' | 'high';
    openIssues: number;
    blockers: number;
}

export interface EngagementTimelineProps {
    engagements: EngagementStatus[];
    view: 'list' | 'timeline' | 'calendar';
    onEngagementClick?: (engagement: EngagementStatus) => void;
}

// ============================================================================
// ALERT & NOTIFICATION TYPES
// ============================================================================

export type AlertType =
    | 'deadline'
    | 'risk'
    | 'approval'
    | 'system'
    | 'mention'
    | 'task';

export interface DashboardAlert {
    id: string;
    type: AlertType;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    timestamp: Date;
    read: boolean;
    actionUrl?: string;
    actionLabel?: string;
    source?: {
        type: 'engagement' | 'client' | 'task' | 'agent';
        id: string;
        name: string;
    };
}

export interface AlertSummaryProps {
    alerts: DashboardAlert[];
    maxVisible?: number;
    onAlertClick?: (alert: DashboardAlert) => void;
    onMarkAllRead?: () => void;
}

// ============================================================================
// DASHBOARD LAYOUT
// ============================================================================

export interface DashboardWidget {
    id: string;
    type: 'kpi' | 'chart' | 'heatmap' | 'timeline' | 'alerts' | 'table' | 'custom';
    title: string;
    gridPosition: { x: number; y: number; w: number; h: number };
    config?: Record<string, unknown>;
}

export interface DashboardConfig {
    id: string;
    name: string;
    widgets: DashboardWidget[];
    refreshInterval?: number;  // seconds
    filters?: DashboardFilter[];
}

export interface DashboardFilter {
    id: string;
    label: string;
    type: 'select' | 'date-range' | 'multi-select' | 'search';
    options?: { value: string; label: string }[];
    defaultValue?: string | string[];
}
