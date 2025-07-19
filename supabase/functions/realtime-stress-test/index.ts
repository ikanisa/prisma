import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface StressTestConfig {
  concurrent_rides: number;
  test_duration_minutes: number;
  target_rps: number; // requests per second
  test_type: 'realtime' | 'api' | 'full';
}

interface StressTestResult {
  test_id: string;
  start_time: string;
  end_time?: string;
  config: StressTestConfig;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  max_response_time: number;
  min_response_time: number;
  errors: Array<{
    timestamp: string;
    error: string;
    request_type: string;
  }>;
  realtime_stats?: {
    connections_established: number;
    connections_failed: number;
    messages_sent: number;
    messages_received: number;
    avg_latency: number;
  };
}

class RealtimeStressTester {
  private testId: string;
  private config: StressTestConfig;
  private results: StressTestResult;
  private connections: WebSocket[] = [];
  private activeTests: boolean = false;

  constructor(config: StressTestConfig) {
    this.testId = crypto.randomUUID();
    this.config = config;
    this.results = {
      test_id: this.testId,
      start_time: new Date().toISOString(),
      config,
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      avg_response_time: 0,
      max_response_time: 0,
      min_response_time: Infinity,
      errors: [],
      realtime_stats: {
        connections_established: 0,
        connections_failed: 0,
        messages_sent: 0,
        messages_received: 0,
        avg_latency: 0
      }
    };
  }

  async runStressTest(): Promise<StressTestResult> {
    console.log(`🔥 Starting stress test ${this.testId} with ${this.config.concurrent_rides} concurrent rides`);
    
    this.activeTests = true;
    
    // Start different test types based on config
    if (this.config.test_type === 'realtime' || this.config.test_type === 'full') {
      await this.testRealtimeConnections();
    }
    
    if (this.config.test_type === 'api' || this.config.test_type === 'full') {
      await this.testApiEndpoints();
    }
    
    // Wait for test duration
    await this.waitForTestCompletion();
    
    // Cleanup and finalize results
    await this.cleanup();
    
    this.results.end_time = new Date().toISOString();
    this.activeTests = false;
    
    // Save results to database
    await this.saveResults();
    
    console.log(`✅ Stress test ${this.testId} completed`);
    return this.results;
  }

  private async testRealtimeConnections(): Promise<void> {
    console.log(`📡 Testing ${this.config.concurrent_rides} realtime connections...`);
    
    const connectionPromises = [];
    
    for (let i = 0; i < this.config.concurrent_rides; i++) {
      connectionPromises.push(this.createRealtimeConnection(i));
      
      // Stagger connection creation to avoid overwhelming
      if (i % 50 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    await Promise.allSettled(connectionPromises);
  }

  private async createRealtimeConnection(connectionId: number): Promise<void> {
    try {
      const ws = new WebSocket(
        `wss://ijblirphkrrsnxazohwt.supabase.co/realtime/v1/websocket?apikey=${Deno.env.get('SUPABASE_ANON_KEY')}&vsn=1.0.0`
      );
      
      const startTime = Date.now();
      
      return new Promise<void>((resolve, reject) => {
        let messageLatencies: number[] = [];
        
        ws.onopen = () => {
          this.results.realtime_stats!.connections_established++;
          
          // Subscribe to rides table changes
          ws.send(JSON.stringify({
            topic: 'realtime:public:ride_requests',
            event: 'phx_join',
            payload: {},
            ref: connectionId.toString()
          }));
          
          // Send periodic heartbeat messages
          const heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && this.activeTests) {
              const messageStart = Date.now();
              ws.send(JSON.stringify({
                topic: 'phoenix',
                event: 'heartbeat',
                payload: {},
                ref: `heartbeat_${connectionId}_${Date.now()}`
              }));
              this.results.realtime_stats!.messages_sent++;
              
              // Track message latency
              setTimeout(() => {
                messageLatencies.push(Date.now() - messageStart);
              }, 1000);
            }
          }, 5000);
          
          // Clean up on test completion
          setTimeout(() => {
            clearInterval(heartbeatInterval);
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          }, this.config.test_duration_minutes * 60 * 1000);
          
          resolve();
        };
        
        ws.onmessage = (event) => {
          this.results.realtime_stats!.messages_received++;
          
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'phx_reply') {
              const latency = Date.now() - startTime;
              messageLatencies.push(latency);
            }
          } catch (e) {
            // Ignore parsing errors for stress test
          }
        };
        
        ws.onerror = (error) => {
          this.results.realtime_stats!.connections_failed++;
          this.results.errors.push({
            timestamp: new Date().toISOString(),
            error: `WebSocket error: ${error}`,
            request_type: 'realtime_connection'
          });
          reject(error);
        };
        
        ws.onclose = () => {
          // Calculate average latency for this connection
          if (messageLatencies.length > 0) {
            const avgLatency = messageLatencies.reduce((sum, lat) => sum + lat, 0) / messageLatencies.length;
            this.results.realtime_stats!.avg_latency = 
              (this.results.realtime_stats!.avg_latency + avgLatency) / 2;
          }
        };
        
        this.connections.push(ws);
      });
    } catch (error) {
      this.results.realtime_stats!.connections_failed++;
      this.results.errors.push({
        timestamp: new Date().toISOString(),
        error: `Connection failed: ${error.message}`,
        request_type: 'realtime_connection'
      });
    }
  }

  private async testApiEndpoints(): Promise<void> {
    console.log(`🔌 Testing API endpoints at ${this.config.target_rps} RPS...`);
    
    const requestInterval = 1000 / this.config.target_rps; // ms between requests
    const testDurationMs = this.config.test_duration_minutes * 60 * 1000;
    const totalRequests = Math.floor(testDurationMs / requestInterval);
    
    const requestPromises = [];
    
    for (let i = 0; i < totalRequests; i++) {
      requestPromises.push(
        new Promise<void>((resolve) => {
          setTimeout(async () => {
            await this.makeApiRequest(i);
            resolve();
          }, i * requestInterval);
        })
      );
    }
    
    await Promise.allSettled(requestPromises);
  }

  private async makeApiRequest(requestId: number): Promise<void> {
    const endpoints = [
      { name: 'fare-estimator', path: '/functions/v1/fare-estimator' },
      { name: 'create-ride', path: '/functions/v1/create-ride' },
      { name: 'passengers-table', path: '/rest/v1/passengers?select=*&limit=10' },
      { name: 'rides-table', path: '/rest/v1/ride_requests?select=*&limit=10' }
    ];
    
    const endpoint = endpoints[requestId % endpoints.length];
    const startTime = Date.now();
    
    try {
      let response;
      
      if (endpoint.name === 'fare-estimator') {
        response = await fetch(`${Deno.env.get('SUPABASE_URL')}${endpoint.path}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            origin: [-1.9441, 30.0619],
            destination: [-1.9706, 30.1044],
            time_of_day: new Date().getHours()
          })
        });
      } else if (endpoint.name === 'create-ride') {
        response = await fetch(`${Deno.env.get('SUPABASE_URL')}${endpoint.path}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            passenger_id: crypto.randomUUID(),
            origin: [-1.9441, 30.0619],
            destination: [-1.9706, 30.1044],
            origin_address: 'Test Origin',
            destination_address: 'Test Destination',
            fare_estimate: 1500
          })
        });
      } else {
        response = await fetch(`${Deno.env.get('SUPABASE_URL')}${endpoint.path}`, {
          headers: {
            'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          }
        });
      }
      
      const responseTime = Date.now() - startTime;
      this.results.total_requests++;
      
      if (response.ok) {
        this.results.successful_requests++;
      } else {
        this.results.failed_requests++;
        this.results.errors.push({
          timestamp: new Date().toISOString(),
          error: `HTTP ${response.status}: ${await response.text()}`,
          request_type: endpoint.name
        });
      }
      
      // Update response time stats
      this.updateResponseTimeStats(responseTime);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.results.total_requests++;
      this.results.failed_requests++;
      
      this.results.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        request_type: endpoint.name
      });
      
      this.updateResponseTimeStats(responseTime);
    }
  }

  private updateResponseTimeStats(responseTime: number): void {
    this.results.max_response_time = Math.max(this.results.max_response_time, responseTime);
    this.results.min_response_time = Math.min(this.results.min_response_time, responseTime);
    
    // Calculate running average
    const total = this.results.avg_response_time * (this.results.total_requests - 1) + responseTime;
    this.results.avg_response_time = total / this.results.total_requests;
  }

  private async waitForTestCompletion(): Promise<void> {
    const testDurationMs = this.config.test_duration_minutes * 60 * 1000;
    await new Promise(resolve => setTimeout(resolve, testDurationMs));
  }

  private async cleanup(): Promise<void> {
    // Close all WebSocket connections
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    this.connections = [];
  }

  private async saveResults(): Promise<void> {
    try {
      await supabase
        .from('stress_test_results')
        .insert({
          test_id: this.results.test_id,
          config: this.results.config,
          results: this.results,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to save stress test results:', error);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { config }: { config: StressTestConfig } = await req.json();
    
    // Validate config
    if (!config || !config.concurrent_rides || !config.test_duration_minutes) {
      throw new Error('Invalid test configuration');
    }
    
    // Limit concurrent rides to prevent overwhelming the system
    if (config.concurrent_rides > 1000) {
      throw new Error('Maximum 1000 concurrent rides allowed');
    }
    
    if (config.test_duration_minutes > 60) {
      throw new Error('Maximum test duration is 60 minutes');
    }
    
    const tester = new RealtimeStressTester(config);
    const results = await tester.runStressTest();
    
    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Stress test error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});