import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getOpenAI, generateIntelligentResponse } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface AgentRequest {
  user_id: string;
  message: string;
  context?: any;
  task_type?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface MemoryContext {
  short_term: any[];
  long_term: any[];
  working_memory: any[];
  episodic: any[];
  semantic: any[];
}

interface ReasoningContext {
  facts: string[];
  assumptions: string[];
  goals: string[];
  constraints: string[];
  strategies: string[];
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: AgentRequest = await req.json();
    
    console.log('🧠 Omni Agent Orchestrator started for:', request.user_id);
    
    // Initialize the orchestrator
    const orchestrator = new OmniAgentOrchestrator(supabase, request);
    
    // Execute the full reasoning and execution pipeline
    const result = await orchestrator.execute();
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Orchestrator error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

class OmniAgentOrchestrator {
  private supabase: any;
  private request: AgentRequest;
  private memoryContext: MemoryContext;
  private reasoningContext: ReasoningContext;
  private executionPlan: any[];
  private performanceMetrics: any;

  constructor(supabase: any, request: AgentRequest) {
    this.supabase = supabase;
    this.request = request;
    this.memoryContext = {
      short_term: [],
      long_term: [],
      working_memory: [],
      episodic: [],
      semantic: []
    };
    this.reasoningContext = {
      facts: [],
      assumptions: [],
      goals: [],
      constraints: [],
      strategies: []
    };
    this.executionPlan = [];
    this.performanceMetrics = {};
  }

  async execute() {
    const startTime = Date.now();
    
    try {
      // 1. Load and consolidate memory
      await this.loadMemoryContext();
      
      // 2. Perform multi-stage reasoning
      await this.performAdvancedReasoning();
      
      // 3. Generate execution plan
      await this.generateExecutionPlan();
      
      // 4. Execute with monitoring
      const executionResult = await this.executeWithMonitoring();
      
      // 5. Learn and adapt
      await this.learnAndAdapt(executionResult);
      
      // 6. Update memory and performance
      await this.updateMemoryAndMetrics(startTime);
      
      return {
        success: true,
        response: executionResult.response,
        reasoning_steps: executionResult.reasoning_steps,
        memory_updates: executionResult.memory_updates,
        performance_metrics: this.performanceMetrics,
        execution_time_ms: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('Execution error:', error);
      await this.logError(error, startTime);
      throw error;
    }
  }

  async loadMemoryContext() {
    console.log('🧠 Loading memory context...');
    
    // Load enhanced memory
    const { data: memoryData } = await this.supabase
      .from('agent_memory_enhanced')
      .select('*')
      .eq('user_id', this.request.user_id)
      .order('importance_weight', { ascending: false })
      .limit(50);

    if (memoryData) {
      // Categorize memories by type
      memoryData.forEach(memory => {
        switch (memory.memory_type) {
          case 'short_term':
            this.memoryContext.short_term.push(memory);
            break;
          case 'long_term':
            this.memoryContext.long_term.push(memory);
            break;
          case 'episodic':
            this.memoryContext.episodic.push(memory);
            break;
          case 'semantic':
            this.memoryContext.semantic.push(memory);
            break;
          default:
            this.memoryContext.working_memory.push(memory);
        }
      });
    }

    // Load document embeddings for semantic search
    const { data: embeddings } = await this.supabase
      .from('agent_document_embeddings')
      .select('*')
      .limit(20);

    if (embeddings) {
      this.memoryContext.semantic.push(...embeddings);
    }

    console.log('Memory context loaded:', {
      short_term: this.memoryContext.short_term.length,
      long_term: this.memoryContext.long_term.length,
      episodic: this.memoryContext.episodic.length,
      semantic: this.memoryContext.semantic.length
    });
  }

  async performAdvancedReasoning() {
    console.log('🤔 Performing advanced reasoning...');
    
    // Prepare reasoning context
    const reasoningPrompt = this.buildReasoningPrompt();
    
    // Use multiple AI models for different reasoning aspects
    const [
      causalReasoning,
      logicalReasoning,
      creativeReasoning,
      strategicReasoning
    ] = await Promise.all([
      this.performCausalReasoning(reasoningPrompt),
      this.performLogicalReasoning(reasoningPrompt),
      this.performCreativeReasoning(reasoningPrompt),
      this.performStrategicReasoning(reasoningPrompt)
    ]);

    // Synthesize reasoning results
    const synthesisPrompt = `
    Synthesize the following reasoning outputs into a coherent understanding:
    
    Causal Reasoning: ${causalReasoning}
    Logical Reasoning: ${logicalReasoning}
    Creative Reasoning: ${creativeReasoning}
    Strategic Reasoning: ${strategicReasoning}
    
    Provide a unified analysis that:
    1. Identifies key facts and assumptions
    2. Establishes clear goals and constraints
    3. Develops comprehensive strategies
    4. Considers multiple perspectives and outcomes
    `;

    const synthesis = await this.callOpenAI(synthesisPrompt, 'gpt-4.1-2025-04-14');
    
    // Parse and structure the reasoning context
    this.reasoningContext = await this.parseReasoningOutput(synthesis);
    
    console.log('Advanced reasoning completed');
  }

  buildReasoningPrompt() {
    const memoryContext = this.formatMemoryForReasoning();
    const userMessage = this.request.message;
    const taskType = this.request.task_type || 'general';
    
    return `
    You are an advanced AI agent with access to comprehensive memory and context.
    
    TASK TYPE: ${taskType}
    USER MESSAGE: ${userMessage}
    
    MEMORY CONTEXT:
    ${memoryContext}
    
    PREVIOUS INTERACTIONS:
    ${this.memoryContext.episodic.slice(0, 5).map(m => m.memory_value).join('\n')}
    
    SEMANTIC KNOWLEDGE:
    ${this.memoryContext.semantic.slice(0, 10).map(m => m.chunk_text || JSON.stringify(m.memory_value)).join('\n')}
    
    Analyze this situation with deep reasoning, considering:
    1. Causal relationships and dependencies
    2. Logical implications and consequences
    3. Creative alternatives and novel approaches
    4. Strategic considerations and long-term planning
    `;
  }

  formatMemoryForReasoning() {
    const memories = [
      ...this.memoryContext.short_term,
      ...this.memoryContext.long_term,
      ...this.memoryContext.working_memory
    ];
    
    return memories
      .filter(m => m.confidence_score > 0.7)
      .slice(0, 20)
      .map(m => `${m.memory_key}: ${JSON.stringify(m.memory_value)}`)
      .join('\n');
  }

  async performCausalReasoning(prompt: string) {
    const causalPrompt = `${prompt}
    
    Focus on CAUSAL REASONING:
    - What are the root causes of the current situation?
    - What chains of causation led to this point?
    - What are the likely downstream effects of different actions?
    - How do different factors interact and influence each other?
    `;
    
    return await this.callOpenAI(causalPrompt, 'gpt-4.1-2025-04-14');
  }

  async performLogicalReasoning(prompt: string) {
    const logicalPrompt = `${prompt}
    
    Focus on LOGICAL REASONING:
    - What logical rules and principles apply?
    - What can be deduced from the available information?
    - What are the logical implications of different choices?
    - What contradictions or logical gaps exist?
    `;
    
    return await this.callOpenAI(logicalPrompt, 'o4-mini-2025-04-16');
  }

  async performCreativeReasoning(prompt: string) {
    const creativePrompt = `${prompt}
    
    Focus on CREATIVE REASONING:
    - What novel approaches or solutions are possible?
    - How can we think outside conventional frameworks?
    - What unexpected connections or analogies apply?
    - What innovative combinations of existing elements are possible?
    `;
    
    return await this.callOpenAI(creativePrompt, 'gpt-4.1-2025-04-14');
  }

  async performStrategicReasoning(prompt: string) {
    const strategicPrompt = `${prompt}
    
    Focus on STRATEGIC REASONING:
    - What are the long-term implications and goals?
    - How do we optimize for multiple objectives?
    - What are the risks and mitigation strategies?
    - How do we sequence actions for maximum effectiveness?
    `;
    
    return await this.callOpenAI(strategicPrompt, 'o3-2025-04-16');
  }

  async parseReasoningOutput(synthesis: string) {
    const parsePrompt = `
    Parse the following reasoning synthesis into structured components:
    
    ${synthesis}
    
    Extract and format as JSON:
    {
      "facts": ["fact1", "fact2", ...],
      "assumptions": ["assumption1", "assumption2", ...],
      "goals": ["goal1", "goal2", ...],
      "constraints": ["constraint1", "constraint2", ...],
      "strategies": ["strategy1", "strategy2", ...]
    }
    `;
    
    const parsed = await this.callOpenAI(parsePrompt, 'gpt-4.1-2025-04-14');
    
    try {
      return JSON.parse(parsed);
    } catch {
      return {
        facts: [synthesis],
        assumptions: [],
        goals: [],
        constraints: [],
        strategies: []
      };
    }
  }

  async generateExecutionPlan() {
    console.log('📋 Generating execution plan...');
    
    const planPrompt = `
    Based on the reasoning analysis, create a detailed execution plan:
    
    FACTS: ${this.reasoningContext.facts.join(', ')}
    GOALS: ${this.reasoningContext.goals.join(', ')}
    STRATEGIES: ${this.reasoningContext.strategies.join(', ')}
    CONSTRAINTS: ${this.reasoningContext.constraints.join(', ')}
    
    USER REQUEST: ${this.request.message}
    
    Create an execution plan with steps that:
    1. Address the user's request comprehensively
    2. Leverage available tools and capabilities
    3. Include verification and quality checks
    4. Consider edge cases and error handling
    5. Optimize for efficiency and effectiveness
    
    Format as JSON array of steps:
    [
      {
        "step": 1,
        "action": "action_name",
        "description": "detailed description",
        "tools": ["tool1", "tool2"],
        "success_criteria": "how to measure success",
        "fallback": "what to do if it fails"
      }
    ]
    `;
    
    const planResponse = await this.callOpenAI(planPrompt, 'gpt-4.1-2025-04-14');
    
    try {
      this.executionPlan = JSON.parse(planResponse);
    } catch {
      this.executionPlan = [{
        step: 1,
        action: "direct_response",
        description: "Provide direct response to user",
        tools: ["language_model"],
        success_criteria: "Clear and helpful response",
        fallback: "Acknowledge limitation and suggest alternatives"
      }];
    }
    
    console.log('Execution plan generated with', this.executionPlan.length, 'steps');
  }

  async executeWithMonitoring() {
    console.log('⚡ Executing plan with monitoring...');
    
    const executionResults = [];
    const reasoningSteps = [];
    const memoryUpdates = [];
    
    for (let i = 0; i < this.executionPlan.length; i++) {
      const step = this.executionPlan[i];
      const stepStartTime = Date.now();
      
      try {
        console.log(`Executing step ${step.step}: ${step.action}`);
        
        const stepResult = await this.executeStep(step);
        
        executionResults.push({
          ...stepResult,
          execution_time_ms: Date.now() - stepStartTime
        });
        
        reasoningSteps.push({
          step: step.step,
          action: step.action,
          result: stepResult.success ? 'success' : 'failure',
          reasoning: stepResult.reasoning
        });
        
        // Update working memory with step results
        if (stepResult.memory_update) {
          memoryUpdates.push(stepResult.memory_update);
          await this.updateWorkingMemory(stepResult.memory_update);
        }
        
        // Check if we should continue or stop
        if (!stepResult.success && !step.fallback) {
          console.log(`Step ${step.step} failed without fallback, stopping execution`);
          break;
        }
        
      } catch (error) {
        console.error(`Step ${step.step} error:`, error);
        executionResults.push({
          success: false,
          error: error.message,
          execution_time_ms: Date.now() - stepStartTime
        });
      }
    }
    
    // Generate final response
    const finalResponse = await this.generateFinalResponse(executionResults);
    
    return {
      response: finalResponse,
      reasoning_steps: reasoningSteps,
      memory_updates: memoryUpdates,
      execution_results: executionResults
    };
  }

  async executeStep(step: any) {
    switch (step.action) {
      case 'direct_response':
        return await this.executeDirectResponse(step);
      case 'search_knowledge':
        return await this.executeKnowledgeSearch(step);
      case 'analyze_data':
        return await this.executeDataAnalysis(step);
      case 'generate_content':
        return await this.executeContentGeneration(step);
      case 'make_decision':
        return await this.executeDecisionMaking(step);
      default:
        return await this.executeGenericAction(step);
    }
  }

  async executeDirectResponse(step: any) {
    const responsePrompt = `
    Based on all previous reasoning and context, provide a comprehensive response to:
    "${this.request.message}"
    
    Consider:
    - All facts and reasoning from previous analysis
    - User's specific needs and context
    - Available capabilities and constraints
    - Quality and completeness of response
    
    Provide a response that is:
    1. Accurate and well-reasoned
    2. Helpful and actionable
    3. Clear and well-structured
    4. Appropriate for the context
    `;
    
    const response = await this.callOpenAI(responsePrompt, 'gpt-4.1-2025-04-14');
    
    return {
      success: true,
      result: response,
      reasoning: "Generated direct response using advanced reasoning context",
      memory_update: {
        memory_key: `response_${Date.now()}`,
        memory_value: { user_message: this.request.message, agent_response: response },
        memory_type: 'episodic',
        confidence_score: 0.9
      }
    };
  }

  async executeKnowledgeSearch(step: any) {
    // Search through semantic memory and documents
    const searchQuery = this.request.message;
    
    // Use vector similarity search if available
    const relevantKnowledge = this.memoryContext.semantic
      .filter(item => item.chunk_text && 
        item.chunk_text.toLowerCase().includes(searchQuery.toLowerCase().split(' ')[0]))
      .slice(0, 5);
    
    return {
      success: true,
      result: relevantKnowledge,
      reasoning: "Searched semantic memory and document embeddings",
      memory_update: {
        memory_key: `search_${Date.now()}`,
        memory_value: { query: searchQuery, results: relevantKnowledge.length },
        memory_type: 'working_memory',
        confidence_score: 0.8
      }
    };
  }

  async executeDataAnalysis(step: any) {
    const analysisPrompt = `
    Analyze the following data and context:
    
    User Request: ${this.request.message}
    Memory Context: ${JSON.stringify(this.memoryContext, null, 2)}
    
    Provide detailed analysis including:
    1. Key patterns and insights
    2. Trends and correlations
    3. Anomalies or issues
    4. Recommendations and next steps
    `;
    
    const analysis = await this.callOpenAI(analysisPrompt, 'o3-2025-04-16');
    
    return {
      success: true,
      result: analysis,
      reasoning: "Performed comprehensive data analysis using advanced reasoning",
      memory_update: {
        memory_key: `analysis_${Date.now()}`,
        memory_value: { type: 'data_analysis', result: analysis },
        memory_type: 'semantic',
        confidence_score: 0.85
      }
    };
  }

  async executeContentGeneration(step: any) {
    const generationPrompt = `
    Generate high-quality content based on:
    
    User Request: ${this.request.message}
    Content Requirements: ${step.description}
    
    Create content that is:
    1. Original and creative
    2. Accurate and well-researched
    3. Engaging and appropriate
    4. Structured and clear
    `;
    
    const content = await this.callOpenAI(generationPrompt, 'gpt-4.1-2025-04-14');
    
    return {
      success: true,
      result: content,
      reasoning: "Generated original content using creative reasoning capabilities",
      memory_update: {
        memory_key: `content_${Date.now()}`,
        memory_value: { type: 'generated_content', content: content },
        memory_type: 'long_term',
        confidence_score: 0.8
      }
    };
  }

  async executeDecisionMaking(step: any) {
    const decisionPrompt = `
    Make an informed decision based on:
    
    User Request: ${this.request.message}
    Available Options: ${JSON.stringify(this.reasoningContext.strategies)}
    Constraints: ${JSON.stringify(this.reasoningContext.constraints)}
    Goals: ${JSON.stringify(this.reasoningContext.goals)}
    
    Consider:
    1. Cost-benefit analysis
    2. Risk assessment
    3. Long-term implications
    4. Stakeholder impact
    
    Provide decision with clear reasoning.
    `;
    
    const decision = await this.callOpenAI(decisionPrompt, 'o3-2025-04-16');
    
    return {
      success: true,
      result: decision,
      reasoning: "Made informed decision using strategic reasoning and analysis",
      memory_update: {
        memory_key: `decision_${Date.now()}`,
        memory_value: { type: 'decision', decision: decision, context: this.reasoningContext },
        memory_type: 'episodic',
        confidence_score: 0.9
      }
    };
  }

  async executeGenericAction(step: any) {
    const genericPrompt = `
    Execute the following action:
    
    Action: ${step.action}
    Description: ${step.description}
    User Request: ${this.request.message}
    Available Tools: ${step.tools?.join(', ')}
    
    Provide the best possible execution of this action.
    `;
    
    const result = await this.callOpenAI(genericPrompt, 'gpt-4.1-2025-04-14');
    
    return {
      success: true,
      result: result,
      reasoning: `Executed generic action: ${step.action}`,
      memory_update: {
        memory_key: `action_${Date.now()}`,
        memory_value: { action: step.action, result: result },
        memory_type: 'working_memory',
        confidence_score: 0.75
      }
    };
  }

  async generateFinalResponse(executionResults: any[]) {
    const responsePrompt = `
    Generate a final comprehensive response based on execution results:
    
    Original Request: ${this.request.message}
    Execution Results: ${JSON.stringify(executionResults, null, 2)}
    
    Create a response that:
    1. Directly addresses the user's request
    2. Incorporates insights from all execution steps
    3. Is clear, helpful, and actionable
    4. Demonstrates high-level reasoning and understanding
    `;
    
    return await this.callOpenAI(responsePrompt, 'gpt-4.1-2025-04-14');
  }

  async updateWorkingMemory(memoryUpdate: any) {
    await this.supabase
      .from('agent_memory_enhanced')
      .insert({
        user_id: this.request.user_id,
        memory_key: memoryUpdate.memory_key,
        memory_value: memoryUpdate.memory_value,
        memory_type: memoryUpdate.memory_type,
        confidence_score: memoryUpdate.confidence_score,
        importance_weight: 1.0
      });
  }

  async learnAndAdapt(executionResult: any) {
    console.log('🎓 Learning and adapting...');
    
    // Analyze performance and update learning
    const learningPrompt = `
    Analyze this execution for learning opportunities:
    
    User Request: ${this.request.message}
    Execution Results: ${JSON.stringify(executionResult, null, 2)}
    
    Identify:
    1. What worked well and why
    2. What could be improved
    3. Patterns to remember for future
    4. Skills or knowledge gaps to address
    
    Provide structured learning insights.
    `;
    
    const learningInsights = await this.callOpenAI(learningPrompt, 'o3-2025-04-16');
    
    // Store learning insights
    await this.supabase
      .from('conversation_learning_log')
      .insert({
        user_id: this.request.user_id,
        learning_summary: learningInsights,
        improvement_note: `Auto-generated from execution ${Date.now()}`,
        confidence_level: 0.8
      });
    
    // Update performance metrics
    await this.updatePerformanceMetrics(executionResult);
  }

  async updatePerformanceMetrics(executionResult: any) {
    const metrics = {
      response_quality: this.calculateResponseQuality(executionResult),
      reasoning_depth: this.calculateReasoningDepth(),
      execution_efficiency: this.calculateExecutionEfficiency(executionResult),
      memory_utilization: this.calculateMemoryUtilization(),
      learning_effectiveness: this.calculateLearningEffectiveness()
    };
    
    this.performanceMetrics = metrics;
    
    // Store metrics in database
    for (const [metricType, value] of Object.entries(metrics)) {
      await this.supabase
        .from('agent_performance_metrics')
        .insert({
          metric_type: metricType,
          metric_value: value,
          measurement_period: 'execution',
          metadata: {
            user_id: this.request.user_id,
            execution_time: Date.now()
          }
        });
    }
  }

  calculateResponseQuality(executionResult: any): number {
    // Quality based on successful steps and response completeness
    const successfulSteps = executionResult.reasoning_steps?.filter(s => s.result === 'success').length || 0;
    const totalSteps = executionResult.reasoning_steps?.length || 1;
    const responseLength = executionResult.response?.length || 0;
    
    return Math.min(1.0, (successfulSteps / totalSteps) * 0.7 + Math.min(responseLength / 500, 1) * 0.3);
  }

  calculateReasoningDepth(): number {
    // Depth based on reasoning context richness
    const totalReasoningElements = 
      this.reasoningContext.facts.length +
      this.reasoningContext.strategies.length +
      this.reasoningContext.goals.length;
    
    return Math.min(1.0, totalReasoningElements / 20);
  }

  calculateExecutionEfficiency(executionResult: any): number {
    // Efficiency based on execution time and success rate
    const totalTime = executionResult.execution_results?.reduce((sum, r) => sum + (r.execution_time_ms || 0), 0) || 1000;
    const successCount = executionResult.execution_results?.filter(r => r.success).length || 0;
    const totalCount = executionResult.execution_results?.length || 1;
    
    const timeEfficiency = Math.max(0, 1 - (totalTime / 30000)); // 30 seconds max
    const successRate = successCount / totalCount;
    
    return (timeEfficiency * 0.4 + successRate * 0.6);
  }

  calculateMemoryUtilization(): number {
    // Utilization based on memory context usage
    const totalMemoryItems = Object.values(this.memoryContext).flat().length;
    return Math.min(1.0, totalMemoryItems / 100);
  }

  calculateLearningEffectiveness(): number {
    // Placeholder for learning effectiveness (would need historical data)
    return 0.8;
  }

  async updateMemoryAndMetrics(startTime: number) {
    const executionTime = Date.now() - startTime;
    
    // Store execution summary in long-term memory
    await this.supabase
      .from('agent_memory_enhanced')
      .insert({
        user_id: this.request.user_id,
        memory_key: `execution_summary_${startTime}`,
        memory_value: {
          request: this.request.message,
          execution_time_ms: executionTime,
          performance_metrics: this.performanceMetrics,
          reasoning_summary: this.reasoningContext
        },
        memory_type: 'long_term',
        confidence_score: 0.9,
        importance_weight: 1.0
      });
  }

  async logError(error: any, startTime: number) {
    await this.supabase
      .from('agent_execution_log')
      .insert({
        function_name: 'omni-agent-orchestrator',
        success_status: false,
        error_details: error.message,
        execution_time_ms: Date.now() - startTime,
        input_data: { user_id: this.request.user_id, message: this.request.message },
        user_id: this.request.user_id
      });
  }

  async callOpenAI(prompt: string, model: string = 'gpt-4.1-2025-04-14'): Promise<string> {
    // Use OpenAI SDK with Rwanda-first intelligence
    const systemPrompt = 'You are an advanced AI agent with sophisticated reasoning capabilities for easyMO Rwanda. Provide comprehensive, accurate, and culturally appropriate responses.';
    
    const response = await generateIntelligentResponse(
      prompt,
      systemPrompt,
      [],
      {
        model: model as any,
        temperature: model.includes('o3') || model.includes('o4') ? 0.1 : 0.3,
        max_tokens: 4000
      }
    );
    
    return response;
  }
}