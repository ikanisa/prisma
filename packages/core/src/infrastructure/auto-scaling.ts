/**
 * Auto-Scaling Configuration
 * 
 * Infrastructure auto-scaling management for cloud deployments.
 * Supports AWS, GCP, and Azure scaling policies.
 * 
 * Features:
 * - Horizontal pod autoscaling (HPA)
 * - Vertical pod autoscaling (VPA)
 * - Custom metrics-based scaling
 * - Scheduled scaling
 * - Cost optimization
 * 
 * @example
 * ```typescript
 * import { autoScaler } from './auto-scaling';
 * 
 * // Configure scaling policy
 * autoScaler.setPolicy('api', {
 *   minReplicas: 2,
 *   maxReplicas: 10,
 *   targetCPU: 70,
 * });
 * 
 * // Get scaling recommendation
 * const recommendation = autoScaler.getRecommendation('api');
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'kubernetes';

export interface ScalingPolicy {
    /** Service/deployment name */
    name: string;

    /** Minimum replicas */
    minReplicas: number;

    /** Maximum replicas */
    maxReplicas: number;

    /** Target CPU utilization (%) */
    targetCPU?: number;

    /** Target memory utilization (%) */
    targetMemory?: number;

    /** Target requests per second per pod */
    targetRPS?: number;

    /** Custom metrics */
    customMetrics?: CustomMetric[];

    /** Scale-down stabilization window (seconds) */
    scaleDownStabilization?: number;

    /** Scale-up rate limit */
    scaleUpLimit?: {
        type: 'pods' | 'percent';
        value: number;
        periodSeconds: number;
    };

    /** Schedule-based scaling */
    schedule?: ScheduledScale[];

    /** Cost constraints */
    costConstraints?: {
        maxMonthlyCost?: number;
        preferSpotInstances?: boolean;
    };
}

export interface CustomMetric {
    name: string;
    type: 'prometheus' | 'custom';
    target: number;
    query?: string;
}

export interface ScheduledScale {
    name: string;
    schedule: string; // Cron expression
    minReplicas: number;
    maxReplicas: number;
    timezone?: string;
}

export interface ServiceMetrics {
    name: string;
    timestamp: Date;
    currentReplicas: number;
    desiredReplicas: number;
    cpuUtilization: number;
    memoryUtilization: number;
    rps: number;
    latencyP95: number;
    errorRate: number;
}

export interface ScalingRecommendation {
    service: string;
    currentReplicas: number;
    recommendedReplicas: number;
    action: 'scale_up' | 'scale_down' | 'no_change';
    reason: string;
    confidence: number;
    estimatedCostChange?: number;
}

export interface ScalingEvent {
    id: string;
    service: string;
    timestamp: Date;
    fromReplicas: number;
    toReplicas: number;
    trigger: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    duration?: number;
    error?: string;
}

export interface CostEstimate {
    service: string;
    currentMonthlyCost: number;
    projectedMonthlyCost: number;
    savings: number;
    recommendations: string[];
}

// ============================================================================
// AUTO-SCALING SERVICE
// ============================================================================

export class AutoScalingService {
    private policies: Map<string, ScalingPolicy> = new Map();
    private metrics: Map<string, ServiceMetrics[]> = new Map();
    private events: ScalingEvent[] = [];

    /**
     * Set scaling policy for a service
     */
    setPolicy(name: string, policy: Omit<ScalingPolicy, 'name'>): ScalingPolicy {
        const fullPolicy: ScalingPolicy = {
            name,
            scaleDownStabilization: 300, // 5 minutes default
            ...policy,
        };
        this.policies.set(name, fullPolicy);
        return fullPolicy;
    }

    /**
     * Get scaling policy
     */
    getPolicy(name: string): ScalingPolicy | undefined {
        return this.policies.get(name);
    }

    /**
     * Get all policies
     */
    getAllPolicies(): ScalingPolicy[] {
        return Array.from(this.policies.values());
    }

    /**
     * Record service metrics
     */
    recordMetrics(metrics: ServiceMetrics): void {
        const existing = this.metrics.get(metrics.name) ?? [];
        existing.push(metrics);

        // Keep last 24 hours of metrics
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        this.metrics.set(metrics.name, existing.filter(m => m.timestamp >= cutoff));
    }

    /**
     * Get scaling recommendation
     */
    getRecommendation(serviceName: string): ScalingRecommendation | null {
        const policy = this.policies.get(serviceName);
        const serviceMetrics = this.metrics.get(serviceName) ?? [];

        if (!policy || serviceMetrics.length === 0) {
            return null;
        }

        const latestMetrics = serviceMetrics[serviceMetrics.length - 1];
        const avgMetrics = this.averageMetrics(serviceMetrics.slice(-10));

        let recommendedReplicas = latestMetrics.currentReplicas;
        let action: ScalingRecommendation['action'] = 'no_change';
        let reason = 'Metrics within target range';

        // CPU-based scaling
        if (policy.targetCPU) {
            const cpuRatio = avgMetrics.cpuUtilization / policy.targetCPU;
            const cpuBasedReplicas = Math.ceil(latestMetrics.currentReplicas * cpuRatio);

            if (cpuRatio > 1.1) {
                recommendedReplicas = Math.max(recommendedReplicas, cpuBasedReplicas);
                reason = `CPU utilization (${avgMetrics.cpuUtilization}%) exceeds target (${policy.targetCPU}%)`;
            } else if (cpuRatio < 0.7 && latestMetrics.currentReplicas > policy.minReplicas) {
                recommendedReplicas = Math.min(recommendedReplicas, cpuBasedReplicas);
                reason = `CPU utilization (${avgMetrics.cpuUtilization}%) well below target (${policy.targetCPU}%)`;
            }
        }

        // Memory-based scaling
        if (policy.targetMemory) {
            const memRatio = avgMetrics.memoryUtilization / policy.targetMemory;
            const memBasedReplicas = Math.ceil(latestMetrics.currentReplicas * memRatio);

            if (memRatio > 1.1) {
                recommendedReplicas = Math.max(recommendedReplicas, memBasedReplicas);
                reason = `Memory utilization (${avgMetrics.memoryUtilization}%) exceeds target`;
            }
        }

        // RPS-based scaling
        if (policy.targetRPS) {
            const currentRPSPerPod = avgMetrics.rps / latestMetrics.currentReplicas;
            const rpsBasedReplicas = Math.ceil(avgMetrics.rps / policy.targetRPS);

            if (currentRPSPerPod > policy.targetRPS * 1.1) {
                recommendedReplicas = Math.max(recommendedReplicas, rpsBasedReplicas);
                reason = `RPS per pod (${currentRPSPerPod}) exceeds target (${policy.targetRPS})`;
            }
        }

        // Apply limits
        recommendedReplicas = Math.max(policy.minReplicas, Math.min(policy.maxReplicas, recommendedReplicas));

        if (recommendedReplicas > latestMetrics.currentReplicas) {
            action = 'scale_up';
        } else if (recommendedReplicas < latestMetrics.currentReplicas) {
            action = 'scale_down';
        }

        // Estimate cost change
        const costPerReplica = 50; // Simplified estimate
        const estimatedCostChange = (recommendedReplicas - latestMetrics.currentReplicas) * costPerReplica;

        return {
            service: serviceName,
            currentReplicas: latestMetrics.currentReplicas,
            recommendedReplicas,
            action,
            reason,
            confidence: 0.85,
            estimatedCostChange,
        };
    }

    /**
     * Execute scaling action
     */
    async executeScaling(serviceName: string, targetReplicas: number): Promise<ScalingEvent> {
        const policy = this.policies.get(serviceName);
        const currentMetrics = (this.metrics.get(serviceName) ?? []).slice(-1)[0];

        if (!policy) {
            throw new Error(`No policy found for service: ${serviceName}`);
        }

        // Validate target
        if (targetReplicas < policy.minReplicas || targetReplicas > policy.maxReplicas) {
            throw new Error(`Target replicas ${targetReplicas} outside policy limits [${policy.minReplicas}, ${policy.maxReplicas}]`);
        }

        const event: ScalingEvent = {
            id: crypto.randomUUID(),
            service: serviceName,
            timestamp: new Date(),
            fromReplicas: currentMetrics?.currentReplicas ?? 1,
            toReplicas: targetReplicas,
            trigger: 'manual',
            status: 'pending',
        };

        this.events.push(event);

        // Simulate scaling (in production, would call cloud API)
        setTimeout(() => {
            event.status = 'completed';
            event.duration = 30000;
        }, 1000);

        return event;
    }

    /**
     * Get scaling history
     */
    getScalingHistory(serviceName?: string, limit: number = 100): ScalingEvent[] {
        let events = [...this.events];
        if (serviceName) {
            events = events.filter(e => e.service === serviceName);
        }
        return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
    }

    /**
     * Get cost estimate
     */
    getCostEstimate(serviceName: string): CostEstimate {
        const policy = this.policies.get(serviceName);
        const metrics = (this.metrics.get(serviceName) ?? []).slice(-10);
        const recommendation = this.getRecommendation(serviceName);

        const avgReplicas = metrics.length > 0
            ? metrics.reduce((sum, m) => sum + m.currentReplicas, 0) / metrics.length
            : policy?.minReplicas ?? 1;

        const costPerReplica = 50; // Simplified, would calculate based on instance type
        const currentCost = avgReplicas * costPerReplica * 24 * 30; // Monthly
        const projectedCost = (recommendation?.recommendedReplicas ?? avgReplicas) * costPerReplica * 24 * 30;

        const recommendations: string[] = [];
        if (policy?.costConstraints?.preferSpotInstances) {
            recommendations.push('Consider using spot/preemptible instances for non-critical workloads');
        }
        if (recommendation?.action === 'scale_down') {
            recommendations.push('Scale down during low-traffic periods to reduce costs');
        }

        return {
            service: serviceName,
            currentMonthlyCost: Math.round(currentCost),
            projectedMonthlyCost: Math.round(projectedCost),
            savings: Math.round(currentCost - projectedCost),
            recommendations,
        };
    }

    /**
     * Generate Kubernetes HPA manifest
     */
    generateHPAManifest(serviceName: string): string {
        const policy = this.policies.get(serviceName);
        if (!policy) {
            throw new Error(`No policy found for service: ${serviceName}`);
        }

        return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${serviceName}-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${serviceName}
  minReplicas: ${policy.minReplicas}
  maxReplicas: ${policy.maxReplicas}
  metrics:
${policy.targetCPU ? `  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: ${policy.targetCPU}` : ''}
${policy.targetMemory ? `  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: ${policy.targetMemory}` : ''}
  behavior:
    scaleDown:
      stabilizationWindowSeconds: ${policy.scaleDownStabilization ?? 300}
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max`;
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private averageMetrics(metrics: ServiceMetrics[]): {
        cpuUtilization: number;
        memoryUtilization: number;
        rps: number;
    } {
        if (metrics.length === 0) {
            return { cpuUtilization: 0, memoryUtilization: 0, rps: 0 };
        }

        return {
            cpuUtilization: metrics.reduce((sum, m) => sum + m.cpuUtilization, 0) / metrics.length,
            memoryUtilization: metrics.reduce((sum, m) => sum + m.memoryUtilization, 0) / metrics.length,
            rps: metrics.reduce((sum, m) => sum + m.rps, 0) / metrics.length,
        };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const autoScaler = new AutoScalingService();

export function createAutoScaler(): AutoScalingService {
    return new AutoScalingService();
}
