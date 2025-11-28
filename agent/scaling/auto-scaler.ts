/**
 * Agent Scaling & Load Balancing System
 * Phase 5: Scale Management
 */

import type { AgentInstance, ScalingConfig, LoadBalancingStrategy } from '../types';

interface AutoScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number; // seconds
}

export class AgentScaler {
  private instances: Map<string, AgentInstance[]> = new Map();
  private scalingConfigs: Map<string, AutoScalingConfig> = new Map();
  private lastScaleActions: Map<string, Date> = new Map();
  
  /**
   * Initialize auto-scaling for an agent
   */
  configureAutoScaling(agentId: string, config: AutoScalingConfig): void {
    this.scalingConfigs.set(agentId, config);
    
    // Ensure minimum instances are running
    this.scaleToTarget(agentId, config.minInstances);
  }
  
  /**
   * Monitor and auto-scale based on load
   */
  async monitorAndScale(agentId: string): Promise<void> {
    const config = this.scalingConfigs.get(agentId);
    if (!config) return;
    
    const currentInstances = this.instances.get(agentId) || [];
    const currentLoad = await this.calculateCurrentLoad(agentId);
    
    // Check cooldown period
    const lastAction = this.lastScaleActions.get(agentId);
    if (lastAction) {
      const timeSinceLastAction = (Date.now() - lastAction.getTime()) / 1000;
      if (timeSinceLastAction < config.cooldownPeriod) {
        return; // Still in cooldown
      }
    }
    
    // Determine if scaling is needed
    if (currentLoad > config.scaleUpThreshold && currentInstances.length < config.maxInstances) {
      await this.scaleUp(agentId);
    } else if (currentLoad < config.scaleDownThreshold && currentInstances.length > config.minInstances) {
      await this.scaleDown(agentId);
    }
  }
  
  /**
   * Scale up (add instance)
   */
  private async scaleUp(agentId: string): Promise<void> {
    const instances = this.instances.get(agentId) || [];
    const newInstance = await this.createInstance(agentId);
    
    instances.push(newInstance);
    this.instances.set(agentId, instances);
    this.lastScaleActions.set(agentId, new Date());
    
    console.log(`Scaled up agent ${agentId}: ${instances.length} instances`);
  }
  
  /**
   * Scale down (remove instance)
   */
  private async scaleDown(agentId: string): Promise<void> {
    const instances = this.instances.get(agentId) || [];
    if (instances.length === 0) return;
    
    // Remove least utilized instance
    const leastUtilized = this.findLeastUtilizedInstance(instances);
    const newInstances = instances.filter(i => i.id !== leastUtilized.id);
    
    await this.terminateInstance(leastUtilized);
    this.instances.set(agentId, newInstances);
    this.lastScaleActions.set(agentId, new Date());
    
    console.log(`Scaled down agent ${agentId}: ${newInstances.length} instances`);
  }
  
  /**
   * Scale to specific target
   */
  private async scaleToTarget(agentId: string, targetCount: number): Promise<void> {
    const currentInstances = this.instances.get(agentId) || [];
    const currentCount = currentInstances.length;
    
    if (currentCount < targetCount) {
      // Scale up
      for (let i = 0; i < targetCount - currentCount; i++) {
        const instance = await this.createInstance(agentId);
        currentInstances.push(instance);
      }
    } else if (currentCount > targetCount) {
      // Scale down
      const toRemove = currentInstances.slice(targetCount);
      for (const instance of toRemove) {
        await this.terminateInstance(instance);
      }
      currentInstances.splice(targetCount);
    }
    
    this.instances.set(agentId, currentInstances);
  }
  
  /**
   * Create new agent instance
   */
  private async createInstance(agentId: string): Promise<AgentInstance> {
    const instance: AgentInstance = {
      id: `${agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      status: 'running',
      createdAt: new Date(),
      currentLoad: 0,
      totalRequests: 0
    };
    
    // Initialize instance (load model, etc.)
    await this.initializeInstance(instance);
    
    return instance;
  }
  
  /**
   * Terminate agent instance
   */
  private async terminateInstance(instance: AgentInstance): Promise<void> {
    // Gracefully shutdown instance
    instance.status = 'terminating';
    
    // Wait for in-flight requests to complete
    while (instance.currentLoad > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    instance.status = 'terminated';
    
    // Cleanup resources
    await this.cleanupInstance(instance);
  }
  
  /**
   * Calculate current load for agent
   */
  private async calculateCurrentLoad(agentId: string): Promise<number> {
    const instances = this.instances.get(agentId) || [];
    if (instances.length === 0) return 0;
    
    const totalLoad = instances.reduce((sum, inst) => sum + inst.currentLoad, 0);
    return totalLoad / instances.length;
  }
  
  /**
   * Find least utilized instance
   */
  private findLeastUtilizedInstance(instances: AgentInstance[]): AgentInstance {
    return instances.reduce((least, current) =>
      current.currentLoad < least.currentLoad ? current : least
    );
  }
  
  private async initializeInstance(instance: AgentInstance): Promise<void> {
    // Load model, warm up, etc.
  }
  
  private async cleanupInstance(instance: AgentInstance): Promise<void> {
    // Free resources, cleanup
  }
}

/**
 * Load balancer for distributing requests across agent instances
 */
export class LoadBalancer {
  private strategy: LoadBalancingStrategy = 'least-connections';
  
  /**
   * Select instance for request
   */
  selectInstance(
    agentId: string,
    availableInstances: AgentInstance[],
    request: any
  ): AgentInstance {
    if (availableInstances.length === 0) {
      throw new Error(`No available instances for agent ${agentId}`);
    }
    
    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobinSelect(availableInstances);
      case 'least-connections':
        return this.leastConnectionsSelect(availableInstances);
      case 'weighted':
        return this.weightedSelect(availableInstances);
      case 'ip-hash':
        return this.ipHashSelect(availableInstances, request);
      default:
        return availableInstances[0];
    }
  }
  
  /**
   * Round-robin selection
   */
  private roundRobinSelect(instances: AgentInstance[]): AgentInstance {
    // Simple round-robin (would need counter in production)
    return instances[Math.floor(Math.random() * instances.length)];
  }
  
  /**
   * Least connections selection
   */
  private leastConnectionsSelect(instances: AgentInstance[]): AgentInstance {
    return instances.reduce((least, current) =>
      current.currentLoad < least.currentLoad ? current : least
    );
  }
  
  /**
   * Weighted selection based on instance capacity/performance
   */
  private weightedSelect(instances: AgentInstance[]): AgentInstance {
    // Assign weights based on performance history
    const weights = instances.map(inst => ({
      instance: inst,
      weight: 1 / (inst.currentLoad + 1) // Inverse of load
    }));
    
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { instance, weight } of weights) {
      random -= weight;
      if (random <= 0) return instance;
    }
    
    return instances[0];
  }
  
  /**
   * IP hash selection for session affinity
   */
  private ipHashSelect(instances: AgentInstance[], request: any): AgentInstance {
    const clientIp = request.clientIp || '0.0.0.0';
    const hash = this.simpleHash(clientIp);
    const index = hash % instances.length;
    return instances[index];
  }
  
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Set load balancing strategy
   */
  setStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
  }
}

/**
 * Request queue manager for handling burst traffic
 */
export class RequestQueue {
  private queues: Map<string, any[]> = new Map();
  private readonly MAX_QUEUE_SIZE = 1000;
  
  /**
   * Enqueue request
   */
  async enqueue(agentId: string, request: any, priority: number = 0): Promise<void> {
    if (!this.queues.has(agentId)) {
      this.queues.set(agentId, []);
    }
    
    const queue = this.queues.get(agentId)!;
    
    if (queue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error(`Queue full for agent ${agentId}`);
    }
    
    queue.push({
      request,
      priority,
      enqueuedAt: new Date()
    });
    
    // Sort by priority (higher first)
    queue.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Dequeue request
   */
  async dequeue(agentId: string): Promise<any | null> {
    const queue = this.queues.get(agentId);
    if (!queue || queue.length === 0) return null;
    
    const item = queue.shift()!;
    
    // Track queuing time
    const queueTime = Date.now() - item.enqueuedAt.getTime();
    item.request.queueTime = queueTime;
    
    return item.request;
  }
  
  /**
   * Get queue depth
   */
  getDepth(agentId: string): number {
    const queue = this.queues.get(agentId);
    return queue ? queue.length : 0;
  }
  
  /**
   * Clear queue
   */
  clear(agentId: string): void {
    this.queues.delete(agentId);
  }
}

export const agentScaler = new AgentScaler();
export const loadBalancer = new LoadBalancer();
export const requestQueue = new RequestQueue();
