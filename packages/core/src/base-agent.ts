import {
  AgentConfig,
  AgentMessage,
  AgentTask,
  AgentCapability,
  AgentTool,
} from './types';

/**
 * Base Agent Class
 * All specialized agents inherit from this base class
 */
export abstract class BaseAgent {
  protected config: AgentConfig;
  protected conversationHistory: AgentMessage[] = [];
  protected activeTasks: Map<string, AgentTask> = new Map();

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Get agent ID
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get agent domain
   */
  getDomain(): string {
    return this.config.domain;
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): AgentCapability[] {
    return this.config.capabilities;
  }

  /**
   * Get agent tools
   */
  getTools(): AgentTool[] {
    return this.config.tools;
  }

  /**
   * Check if agent can handle a specific task type
   */
  canHandle(taskType: string): boolean {
    return this.config.capabilities.some(
      (cap) => cap.id === taskType || cap.name.toLowerCase().includes(taskType.toLowerCase())
    );
  }

  /**
   * Add message to conversation history
   */
  protected addMessage(message: AgentMessage): void {
    this.conversationHistory.push(message);
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): AgentMessage[] {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Register a new task
   */
  protected registerTask(task: AgentTask): void {
    this.activeTasks.set(task.id, task);
  }

  /**
   * Update task status
   */
  protected updateTaskStatus(
    taskId: string,
    status: AgentTask['status'],
    result?: any,
    error?: string
  ): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.status = status;
      if (result !== undefined) task.result = result;
      if (error) task.error = error;
      if (status === 'completed' || status === 'failed') {
        task.completedAt = new Date();
      }
    }
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Process a task (abstract method to be implemented by child classes)
   */
  abstract processTask(task: AgentTask): Promise<any>;

  /**
   * Process a message (abstract method to be implemented by child classes)
   */
  abstract processMessage(message: string, context?: any): Promise<string>;

  /**
   * Validate input against guardrails
   */
  protected validateGuardrails(input: any): { valid: boolean; violations: string[] } {
    const violations: string[] = [];
    
    // Implement guardrail validation logic here
    // This would check against this.config.guardrails.rules
    
    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Check if escalation is needed
   */
  protected shouldEscalate(task: AgentTask, result: any): boolean {
    // Check escalation triggers from guardrails
    const triggers = this.config.guardrails.escalation_triggers || [];
    
    // Implement escalation logic
    // This would check if any trigger conditions are met
    
    return false;
  }

  /**
   * Generate system prompt with context
   */
  protected generateSystemPrompt(context?: any): string {
    let prompt = this.config.system_prompt;
    
    // Add context-specific information
    if (context) {
      prompt += '\n\nCONTEXT:\n' + JSON.stringify(context, null, 2);
    }
    
    return prompt;
  }

  /**
   * Log agent activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agentId: this.config.id,
      agentName: this.config.name,
      level,
      message,
      data,
    };
    
    // In production, this would integrate with a proper logging system
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Orchestrator Agent Base Class
 */
export abstract class OrchestratorAgent extends BaseAgent {
  protected subordinateAgents: Map<string, BaseAgent> = new Map();

  /**
   * Register a subordinate agent
   */
  registerAgent(agent: BaseAgent): void {
    this.subordinateAgents.set(agent.getId(), agent);
    this.log('info', `Registered subordinate agent: ${agent.getName()}`);
  }

  /**
   * Get subordinate agent by ID
   */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.subordinateAgents.get(agentId);
  }

  /**
   * Find agents by capability
   */
  findAgentsByCapability(capability: string): BaseAgent[] {
    return Array.from(this.subordinateAgents.values()).filter((agent) =>
      agent.canHandle(capability)
    );
  }

  /**
   * Route task to appropriate agent
   */
  protected routeTask(task: AgentTask): BaseAgent | null {
    const capableAgents = this.findAgentsByCapability(task.type);
    
    if (capableAgents.length === 0) {
      this.log('warn', `No agent found to handle task type: ${task.type}`);
      return null;
    }
    
    // Simple routing: return first capable agent
    // In production, this would use more sophisticated routing logic
    return capableAgents[0];
  }

  /**
   * Delegate task to subordinate agent
   */
  protected async delegateTask(task: AgentTask): Promise<any> {
    const agent = this.routeTask(task);
    
    if (!agent) {
      throw new Error(`No capable agent found for task: ${task.type}`);
    }
    
    this.log('info', `Delegating task ${task.id} to agent ${agent.getName()}`);
    
    try {
      const result = await agent.processTask(task);
      this.log('info', `Task ${task.id} completed by ${agent.getName()}`);
      return result;
    } catch (error) {
      this.log('error', `Task ${task.id} failed in agent ${agent.getName()}`, error);
      throw error;
    }
  }

  /**
   * Coordinate multiple agents for complex tasks
   */
  protected async coordinateAgents(
    tasks: AgentTask[]
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    // Process tasks with dependencies
    const taskGraph = this.buildDependencyGraph(tasks);
    const executionOrder = this.topologicalSort(taskGraph);
    
    for (const taskId of executionOrder) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        try {
          const result = await this.delegateTask(task);
          results.set(taskId, result);
          this.updateTaskStatus(taskId, 'completed', result);
        } catch (error) {
          this.updateTaskStatus(taskId, 'failed', undefined, String(error));
          throw error;
        }
      }
    }
    
    return results;
  }

  /**
   * Build dependency graph from tasks
   */
  private buildDependencyGraph(tasks: AgentTask[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    tasks.forEach((task) => {
      graph.set(task.id, task.dependencies || []);
    });
    
    return graph;
  }

  /**
   * Topological sort for task execution order
   */
  private topologicalSort(graph: Map<string, string[]>): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();
    
    const visit = (node: string) => {
      if (temp.has(node)) {
        throw new Error('Circular dependency detected');
      }
      if (!visited.has(node)) {
        temp.add(node);
        const dependencies = graph.get(node) || [];
        dependencies.forEach(visit);
        temp.delete(node);
        visited.add(node);
        sorted.push(node);
      }
    };
    
    Array.from(graph.keys()).forEach(visit);
    
    return sorted;
  }
}

/**
 * Specialist Agent Base Class
 */
export abstract class SpecialistAgent extends BaseAgent {
  /**
   * Validate specialized input
   */
  protected abstract validateInput(input: any): { valid: boolean; errors: string[] };

  /**
   * Execute specialized logic
   */
  protected abstract execute(task: AgentTask): Promise<any>;

  /**
   * Process task implementation
   */
  async processTask(task: AgentTask): Promise<any> {
    this.registerTask(task);
    this.updateTaskStatus(task.id, 'in_progress');
    
    try {
      // Validate input
      const validation = this.validateInput(task.input);
      if (!validation.valid) {
        throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
      }
      
      // Check guardrails
      const guardrailCheck = this.validateGuardrails(task.input);
      if (!guardrailCheck.valid) {
        throw new Error(`Guardrail violation: ${guardrailCheck.violations.join(', ')}`);
      }
      
      // Execute specialized logic
      const result = await this.execute(task);
      
      // Check if escalation needed
      if (this.shouldEscalate(task, result)) {
        this.updateTaskStatus(task.id, 'escalated');
        this.log('warn', `Task ${task.id} escalated`);
        throw new Error('Task requires human review');
      }
      
      this.updateTaskStatus(task.id, 'completed', result);
      return result;
    } catch (error) {
      this.updateTaskStatus(task.id, 'failed', undefined, String(error));
      this.log('error', `Task ${task.id} failed`, error);
      throw error;
    }
  }
}
