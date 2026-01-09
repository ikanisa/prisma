'use client';

/**
 * Unified Command Center Dashboard
 * 
 * Real-time monitoring dashboard for tax nexus, audit status, and AI agent activity.
 * Provides Big-4 level visibility into all workstreams.
 */

import React, { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface NexusExposure {
    jurisdiction: string;
    jurisdictionName: string;
    currentSales: number;
    threshold: number;
    percent: number;
    status: 'safe' | 'approaching' | 'exceeded' | 'registered';
    daysToThreshold?: number;
}

interface AuditAlert {
    id: string;
    type: 'anomaly' | 'control_deviation' | 'evidence_needed' | 'deadline';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    timestamp: Date;
    acknowledged: boolean;
}

interface AgentStatus {
    id: string;
    name: string;
    type: 'tax' | 'audit' | 'accounting';
    status: 'idle' | 'running' | 'error';
    currentTask?: string;
    lastActivity: Date;
    tasksCompleted: number;
}

interface CommandCenterProps {
    engagementId?: string;
    onAgentSelect?: (agentId: string) => void;
}

// ============================================================================
// MOCK DATA (would come from API in production)
// ============================================================================

const mockNexusData: NexusExposure[] = [
    { jurisdiction: 'US-CA', jurisdictionName: 'California', currentSales: 485000, threshold: 500000, percent: 97, status: 'approaching', daysToThreshold: 12 },
    { jurisdiction: 'US-TX', jurisdictionName: 'Texas', currentSales: 520000, threshold: 500000, percent: 104, status: 'exceeded' },
    { jurisdiction: 'US-NY', jurisdictionName: 'New York', currentSales: 380000, threshold: 500000, percent: 76, status: 'approaching' },
    { jurisdiction: 'US-FL', jurisdictionName: 'Florida', currentSales: 120000, threshold: 100000, percent: 120, status: 'registered' },
    { jurisdiction: 'US-WA', jurisdictionName: 'Washington', currentSales: 45000, threshold: 100000, percent: 45, status: 'safe' },
];

const mockAlerts: AuditAlert[] = [
    { id: '1', type: 'anomaly', severity: 'high', title: 'Unusual Journal Entry', description: 'Manual entry to revenue account exceeding $50,000', timestamp: new Date(), acknowledged: false },
    { id: '2', type: 'control_deviation', severity: 'medium', title: 'Missing Approval', description: '3 transactions above threshold without 2nd approval', timestamp: new Date(), acknowledged: false },
    { id: '3', type: 'deadline', severity: 'critical', title: 'Filing Deadline', description: 'CA Sales Tax Q1 due in 5 days', timestamp: new Date(), acknowledged: true },
];

const mockAgents: AgentStatus[] = [
    { id: 'nexus-agent', name: 'Nexus Monitoring Agent', type: 'tax', status: 'running', currentTask: 'Monitoring CA threshold', lastActivity: new Date(), tasksCompleted: 42 },
    { id: 'filing-agent', name: 'Filing Automation Agent', type: 'tax', status: 'idle', lastActivity: new Date(), tasksCompleted: 15 },
    { id: 'audit-agent', name: 'Continuous Monitoring Agent', type: 'audit', status: 'running', currentTask: 'Processing batch 47', lastActivity: new Date(), tasksCompleted: 156 },
    { id: 'workpaper-agent', name: 'Workpaper Automation Agent', type: 'audit', status: 'idle', lastActivity: new Date(), tasksCompleted: 23 },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function NexusHeatMap({ data }: { data: NexusExposure[] }) {
    const getStatusColor = (status: NexusExposure['status']) => {
        switch (status) {
            case 'exceeded': return 'bg-red-500';
            case 'approaching': return 'bg-yellow-500';
            case 'registered': return 'bg-blue-500';
            default: return 'bg-green-500';
        }
    };

    const getStatusBg = (status: NexusExposure['status']) => {
        switch (status) {
            case 'exceeded': return 'bg-red-50 border-red-200';
            case 'approaching': return 'bg-yellow-50 border-yellow-200';
            case 'registered': return 'bg-blue-50 border-blue-200';
            default: return 'bg-green-50 border-green-200';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">🗺️</span>
                Tax Nexus Heat Map
            </h3>
            <div className="space-y-3">
                {data.map((item) => (
                    <div key={item.jurisdiction} className={`p-3 rounded border ${getStatusBg(item.status)}`}>
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <span className="font-medium">{item.jurisdictionName}</span>
                                <span className="text-gray-500 text-sm ml-2">({item.jurisdiction})</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(item.status)}`}>
                                {item.status.toUpperCase()}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full ${getStatusColor(item.status)}`}
                                style={{ width: `${Math.min(100, item.percent)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 mt-1">
                            <span>${item.currentSales.toLocaleString()}</span>
                            <span>{item.percent}% of ${item.threshold.toLocaleString()}</span>
                        </div>
                        {item.daysToThreshold && (
                            <p className="text-sm text-orange-600 mt-1">⚠️ Est. {item.daysToThreshold} days to threshold</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function AlertsPanel({ alerts, onAcknowledge }: { alerts: AuditAlert[]; onAcknowledge: (id: string) => void }) {
    const getSeverityColor = (severity: AuditAlert['severity']) => {
        switch (severity) {
            case 'critical': return 'border-l-red-500 bg-red-50';
            case 'high': return 'border-l-orange-500 bg-orange-50';
            case 'medium': return 'border-l-yellow-500 bg-yellow-50';
            default: return 'border-l-blue-500 bg-blue-50';
        }
    };

    const getSeverityIcon = (severity: AuditAlert['severity']) => {
        switch (severity) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '📢';
            default: return 'ℹ️';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">🔔</span>
                Active Alerts
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {alerts.filter(a => !a.acknowledged).length}
                </span>
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`p-3 border-l-4 rounded ${getSeverityColor(alert.severity)} ${alert.acknowledged ? 'opacity-50' : ''}`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium flex items-center gap-1">
                                    <span>{getSeverityIcon(alert.severity)}</span>
                                    {alert.title}
                                </p>
                                <p className="text-sm text-gray-600">{alert.description}</p>
                            </div>
                            {!alert.acknowledged && (
                                <button
                                    onClick={() => onAcknowledge(alert.id)}
                                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                                >
                                    Acknowledge
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AgentStatusPanel({ agents, onSelect }: { agents: AgentStatus[]; onSelect: (id: string) => void }) {
    const getStatusColor = (status: AgentStatus['status']) => {
        switch (status) {
            case 'running': return 'bg-green-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    };

    const getTypeIcon = (type: AgentStatus['type']) => {
        switch (type) {
            case 'tax': return '💰';
            case 'audit': return '🔍';
            default: return '📊';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">🤖</span>
                AI Agent Status
            </h3>
            <div className="space-y-2">
                {agents.map((agent) => (
                    <div
                        key={agent.id}
                        onClick={() => onSelect(agent.id)}
                        className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)} ${agent.status === 'running' ? 'animate-pulse' : ''}`} />
                                <span>{getTypeIcon(agent.type)}</span>
                                <span className="font-medium">{agent.name}</span>
                            </div>
                            <span className="text-xs text-gray-500">{agent.tasksCompleted} tasks</span>
                        </div>
                        {agent.currentTask && (
                            <p className="text-sm text-gray-500 mt-1 ml-5">→ {agent.currentTask}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function MetricCard({ title, value, subtitle, trend, icon }: {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon: string;
}) {
    const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
    const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{icon}</span>
                <span className="text-gray-600">{title}</span>
            </div>
            <div className="text-3xl font-bold">{value}</div>
            {subtitle && (
                <p className={`text-sm ${trendColor}`}>
                    {trendIcon} {subtitle}
                </p>
            )}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CommandCenterDashboard({ engagementId, onAgentSelect }: CommandCenterProps) {
    const [nexusData, setNexusData] = useState<NexusExposure[]>(mockNexusData);
    const [alerts, setAlerts] = useState<AuditAlert[]>(mockAlerts);
    const [agents, setAgents] = useState<AgentStatus[]>(mockAgents);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            setLastRefresh(new Date());
            // In production, would fetch from API
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleAcknowledge = (alertId: string) => {
        setAlerts(prev => prev.map(a =>
            a.id === alertId ? { ...a, acknowledged: true } : a
        ));
    };

    const handleAgentSelect = (agentId: string) => {
        onAgentSelect?.(agentId);
    };

    // Calculate metrics
    const activeAlerts = alerts.filter(a => !a.acknowledged).length;
    const criticalJurisdictions = nexusData.filter(n => n.status === 'exceeded' || n.status === 'approaching').length;
    const runningAgents = agents.filter(a => a.status === 'running').length;

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <span>📊</span>
                    Command Center
                </h1>
                <p className="text-gray-600">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                    {engagementId && <span className="ml-2">• Engagement: {engagementId}</span>}
                </p>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <MetricCard
                    icon="🎯"
                    title="Jurisdictions at Risk"
                    value={criticalJurisdictions}
                    subtitle={`of ${nexusData.length} monitored`}
                    trend={criticalJurisdictions > 2 ? 'down' : 'up'}
                />
                <MetricCard
                    icon="🔔"
                    title="Active Alerts"
                    value={activeAlerts}
                    subtitle={activeAlerts > 3 ? 'Requires attention' : 'Under control'}
                    trend={activeAlerts > 3 ? 'down' : 'up'}
                />
                <MetricCard
                    icon="🤖"
                    title="Agents Running"
                    value={`${runningAgents}/${agents.length}`}
                    subtitle="Processing tasks"
                    trend="neutral"
                />
                <MetricCard
                    icon="✅"
                    title="Tasks Today"
                    value={agents.reduce((sum, a) => sum + a.tasksCompleted, 0)}
                    subtitle="+12% vs yesterday"
                    trend="up"
                />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <NexusHeatMap data={nexusData} />
                </div>
                <div className="space-y-6">
                    <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledge} />
                    <AgentStatusPanel agents={agents} onSelect={handleAgentSelect} />
                </div>
            </div>
        </div>
    );
}

export default CommandCenterDashboard;
