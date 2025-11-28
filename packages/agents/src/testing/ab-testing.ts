/**
 * A/B Testing Framework for Agent Optimization
 * 
 * Enables controlled experiments to test prompt variations,
 * model changes, and other optimizations.
 */

import { logger } from '@prisma-glow/logger';
import crypto from 'crypto';

export interface ABTest {
  id: string;
  name: string;
  agent_id: string;
  
  control: TestVariant;
  treatment: TestVariant;
  
  traffic_split: number;
  duration_days: number;
  min_samples: number;
  
  primary_metric: MetricType;
  secondary_metrics: MetricType[];
  
  status: 'draft' | 'running' | 'completed' | 'paused';
  started_at?: Date;
  completed_at?: Date;
  
  results?: TestResults;
}

export interface TestVariant {
  id: string;
  name: string;
  prompt_template?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  other_config?: Record<string, any>;
}

export type MetricType = 
  | 'accuracy'
  | 'response_time'
  | 'user_satisfaction'
  | 'cost'
  | 'error_rate';

export interface TestResults {
  control: VariantResults;
  treatment: VariantResults;
  statistical_significance: StatisticalSignificance;
  recommendation: 'deploy_treatment' | 'keep_control' | 'inconclusive';
}

export interface VariantResults {
  sample_size: number;
  metrics: Record<MetricType, number>;
  cost_total: number;
}

export interface StatisticalSignificance {
  p_value: number;
  confidence: number;
  is_significant: boolean;
}

export class ABTestingFramework {
  constructor(private readonly db: any) {}

  /**
   * Create and start A/B test
   */
  async createTest(
    agentId: string,
    control: TestVariant,
    treatment: TestVariant,
    config: {
      name: string;
      traffic_split?: number;
      duration_days?: number;
      min_samples?: number;
      primary_metric: MetricType;
      secondary_metrics?: MetricType[];
    }
  ): Promise<ABTest> {
    logger.info('Creating A/B test', { agentId, name: config.name });

    const test: ABTest = {
      id: crypto.randomUUID(),
      name: config.name,
      agent_id: agentId,
      control,
      treatment,
      traffic_split: config.traffic_split || 0.5,
      duration_days: config.duration_days || 14,
      min_samples: config.min_samples || 100,
      primary_metric: config.primary_metric,
      secondary_metrics: config.secondary_metrics || [],
      status: 'draft'
    };
    
    await this.saveTest(test);
    logger.info('A/B test created', { testId: test.id });
    
    return test;
  }

  /**
   * Start test
   */
  async startTest(testId: string): Promise<void> {
    logger.info('Starting A/B test', { testId });
    
    await this.db.ab_tests.update({
      where: { id: testId },
      data: {
        status: 'running',
        started_at: new Date()
      }
    });
  }

  /**
   * Route request to appropriate variant
   */
  async routeRequest(
    agentId: string,
    request: { user_id?: string; session_id?: string }
  ): Promise<'control' | 'treatment'> {
    const activeTest = await this.getActiveTest(agentId);
    
    if (!activeTest) {
      return 'control';
    }
    
    const hash = this.hashRequest(request);
    
    return hash < activeTest.traffic_split ? 'treatment' : 'control';
  }

  /**
   * Record test execution
   */
  async recordExecution(
    testId: string,
    variant: 'control' | 'treatment',
    metrics: Partial<Record<MetricType, number>>,
    cost: number
  ): Promise<void> {
    await this.db.ab_test_executions.create({
      data: {
        test_id: testId,
        variant,
        metrics,
        cost,
        timestamp: new Date()
      }
    });
  }

  /**
   * Analyze test results
   */
  async analyzeResults(testId: string): Promise<TestResults> {
    logger.info('Analyzing A/B test results', { testId });
    
    const test = await this.getTest(testId);
    const executions = await this.getTestExecutions(testId);
    
    const controlExecutions = executions.filter(e => e.variant === 'control');
    const treatmentExecutions = executions.filter(e => e.variant === 'treatment');
    
    const controlResults = this.calculateVariantResults(
      controlExecutions,
      test.primary_metric,
      test.secondary_metrics
    );
    
    const treatmentResults = this.calculateVariantResults(
      treatmentExecutions,
      test.primary_metric,
      test.secondary_metrics
    );
    
    const significance = this.calculateSignificance(
      controlResults,
      treatmentResults,
      test.primary_metric
    );
    
    const recommendation = this.generateRecommendation(
      controlResults,
      treatmentResults,
      significance
    );
    
    const results: TestResults = {
      control: controlResults,
      treatment: treatmentResults,
      statistical_significance: significance,
      recommendation
    };
    
    await this.db.ab_tests.update({
      where: { id: testId },
      data: { results }
    });
    
    return results;
  }

  /**
   * Automatically conclude tests and deploy winners
   */
  async autoConclude(): Promise<void> {
    const activeTests = await this.getActiveTests();
    
    for (const test of activeTests) {
      if (!this.shouldConclude(test)) {
        continue;
      }
      
      const results = await this.analyzeResults(test.id);
      
      await this.db.ab_tests.update({
        where: { id: test.id },
        data: {
          status: 'completed',
          completed_at: new Date()
        }
      });
      
      if (results.recommendation === 'deploy_treatment') {
        await this.deployTreatment(test);
      }
      
      logger.info('A/B test concluded', {
        testId: test.id,
        recommendation: results.recommendation
      });
    }
  }

  /**
   * Deploy treatment variant as new default
   */
  async deployTreatment(test: ABTest): Promise<void> {
    logger.info('Deploying treatment variant', {
      testId: test.id,
      agentId: test.agent_id
    });
    
    await this.db.agent_configurations.update({
      where: { agent_id: test.agent_id },
      data: {
        prompt_template: test.treatment.prompt_template,
        model: test.treatment.model,
        temperature: test.treatment.temperature,
        max_tokens: test.treatment.max_tokens,
        ...test.treatment.other_config
      }
    });
    
    await this.db.ab_test_deployments.create({
      data: {
        test_id: test.id,
        deployed_at: new Date(),
        deployed_by: 'auto_conclude'
      }
    });
  }

  // Private helper methods
  
  private hashRequest(request: { user_id?: string; session_id?: string }): number {
    const key = request.user_id || request.session_id || crypto.randomUUID();
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  }

  private calculateVariantResults(
    executions: any[],
    primaryMetric: MetricType,
    secondaryMetrics: MetricType[]
  ): VariantResults {
    const metrics: Record<MetricType, number> = {} as any;
    
    const allMetrics = [primaryMetric, ...secondaryMetrics];
    
    for (const metric of allMetrics) {
      const values = executions
        .map(e => e.metrics[metric])
        .filter((v: any) => v != null);
      
      if (values.length > 0) {
        metrics[metric] = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      }
    }
    
    const totalCost = executions.reduce((sum, e) => sum + (e.cost || 0), 0);
    
    return {
      sample_size: executions.length,
      metrics,
      cost_total: totalCost
    };
  }

  private calculateSignificance(
    control: VariantResults,
    treatment: VariantResults,
    metric: MetricType
  ): StatisticalSignificance {
    // Simplified t-test approximation
    const controlMean = control.metrics[metric] || 0;
    const treatmentMean = treatment.metrics[metric] || 0;
    
    const pooledStdDev = 0.1; // Simplified
    const standardError = pooledStdDev * Math.sqrt(
      1 / control.sample_size + 1 / treatment.sample_size
    );
    
    const tStatistic = Math.abs(treatmentMean - controlMean) / standardError;
    
    // Approximate p-value
    const pValue = 2 * (1 - this.normalCDF(tStatistic));
    
    const isSignificant = pValue < 0.05;
    const confidence = (1 - pValue) * 100;
    
    return {
      p_value: pValue,
      confidence,
      is_significant: isSignificant
    };
  }

  private normalCDF(x: number): number {
    // Approximation of normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  private generateRecommendation(
    control: VariantResults,
    treatment: VariantResults,
    significance: StatisticalSignificance
  ): 'deploy_treatment' | 'keep_control' | 'inconclusive' {
    if (!significance.is_significant) {
      return 'inconclusive';
    }
    
    if (control.sample_size < 50 || treatment.sample_size < 50) {
      return 'inconclusive';
    }
    
    // Check if treatment is better
    // (assuming higher is better for all metrics except cost and error_rate)
    const treatmentBetter = Object.keys(treatment.metrics).some(key => {
      const metric = key as MetricType;
      const treatmentValue = treatment.metrics[metric] || 0;
      const controlValue = control.metrics[metric] || 0;
      
      if (metric === 'cost' || metric === 'error_rate') {
        return treatmentValue < controlValue;
      }
      return treatmentValue > controlValue;
    });
    
    return treatmentBetter ? 'deploy_treatment' : 'keep_control';
  }

  private shouldConclude(test: ABTest): boolean {
    if (!test.started_at) return false;
    
    const now = new Date();
    const duration = (now.getTime() - test.started_at.getTime()) / (1000 * 60 * 60 * 24);
    
    return duration >= test.duration_days;
  }

  private async saveTest(test: ABTest): Promise<void> {
    await this.db.ab_tests.create({ data: test });
  }

  private async getTest(testId: string): Promise<ABTest> {
    return this.db.ab_tests.findUnique({ where: { id: testId } });
  }

  private async getActiveTest(agentId: string): Promise<ABTest | null> {
    return this.db.ab_tests.findFirst({
      where: {
        agent_id: agentId,
        status: 'running'
      }
    });
  }

  private async getActiveTests(): Promise<ABTest[]> {
    return this.db.ab_tests.findMany({
      where: { status: 'running' }
    });
  }

  private async getTestExecutions(testId: string): Promise<any[]> {
    return this.db.ab_test_executions.findMany({
      where: { test_id: testId }
    });
  }
}
