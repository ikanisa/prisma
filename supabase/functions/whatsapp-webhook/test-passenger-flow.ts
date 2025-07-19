/**
 * Comprehensive QA Test Script: Passenger Ride Journey
 * Tests: ride request → driver match → payment → rating
 * Usage: deno run --allow-net test-passenger-flow.ts
 */

const SUPABASE_URL = 'https://ijblirphkrrsnxazohwt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs';

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  details: any;
  error?: string;
}

class PassengerFlowTester {
  private results: TestResult[] = [];
  private testData = {
    passenger: {
      id: crypto.randomUUID(),
      phone: '+250788123456',
      name: 'Test Passenger',
      origin: [-1.9441, 30.0619], // Kigali coordinates [lat, lng]
      destination: [-1.9706, 30.1044],
      origin_address: 'Kigali City Center',
      destination_address: 'Kigali Airport'
    },
    driver: {
      id: crypto.randomUUID(),
      phone: '+250788654321',
      name: 'Test Driver',
      plate: 'RC-TEST'
    }
  };

  async runFullTest(): Promise<void> {
    console.log('🚀 Starting Passenger Flow Test Suite...\n');
    
    // Step 1: Setup test data
    await this.step1_setupTestData();
    
    // Step 2: Test fare estimation
    await this.step2_testFareEstimation();
    
    // Step 3: Create ride request
    await this.step3_createRideRequest();
    
    // Step 4: Assign driver
    await this.step4_assignDriver();
    
    // Step 5: Process payment
    await this.step5_processPayment();
    
    // Step 6: Submit rating
    await this.step6_submitRating();
    
    // Step 7: Cleanup
    await this.step7_cleanup();
    
    this.printResults();
  }

  private async executeStep(
    stepName: string, 
    testFunction: () => Promise<any>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 ${stepName}...`);
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.results.push({
        step: stepName,
        status: 'PASS',
        duration,
        details: result
      });
      
      console.log(`✅ ${stepName} PASSED (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        step: stepName,
        status: 'FAIL',
        duration,
        details: null,
        error: error.message
      });
      
      console.log(`❌ ${stepName} FAILED (${duration}ms): ${error.message}\n`);
    }
  }

  private async step1_setupTestData(): Promise<any> {
    await this.executeStep('Setup Test Data', async () => {
      // Create test passenger
      const passengerResponse = await fetch(`${SUPABASE_URL}/rest/v1/passengers`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: this.testData.passenger.id,
          full_name: this.testData.passenger.name,
          whatsapp_number: this.testData.passenger.phone,
          preferred_lang: 'en'
        })
      });

      if (!passengerResponse.ok) {
        throw new Error(`Failed to create passenger: ${await passengerResponse.text()}`);
      }

      // Create test driver
      const driverResponse = await fetch(`${SUPABASE_URL}/rest/v1/drivers`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: this.testData.driver.id,
          full_name: this.testData.driver.name,
          vehicle_plate: this.testData.driver.plate,
          is_online: true,
          location_gps: `POINT(${this.testData.passenger.origin[1]} ${this.testData.passenger.origin[0]})`
        })
      });

      if (!driverResponse.ok) {
        throw new Error(`Failed to create driver: ${await driverResponse.text()}`);
      }

      return { passenger: true, driver: true };
    });
  }

  private async step2_testFareEstimation(): Promise<any> {
    await this.executeStep('Test Fare Estimation', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/fare-estimator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          origin: this.testData.passenger.origin,
          destination: this.testData.passenger.destination,
          time_of_day: new Date().getHours()
        })
      });

      if (!response.ok) {
        throw new Error(`Fare estimation failed: ${await response.text()}`);
      }

      const fareData = await response.json();
      
      if (!fareData.success || !fareData.fare_estimate) {
        throw new Error('Invalid fare estimation response');
      }

      return fareData;
    });
  }

  private async step3_createRideRequest(): Promise<any> {
    await this.executeStep('Create Ride Request', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-ride`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          passenger_id: this.testData.passenger.id,
          origin: this.testData.passenger.origin,
          destination: this.testData.passenger.destination,
          origin_address: this.testData.passenger.origin_address,
          destination_address: this.testData.passenger.destination_address,
          fare_estimate: 1500
        })
      });

      if (!response.ok) {
        throw new Error(`Ride creation failed: ${await response.text()}`);
      }

      const rideData = await response.json();
      
      if (!rideData.success) {
        throw new Error('Ride request creation failed');
      }

      this.testData.ride_request_id = rideData.ride_request_id;
      this.testData.trip_id = rideData.trip_id;

      return rideData;
    });
  }

  private async step4_assignDriver(): Promise<any> {
    await this.executeStep('Assign Driver', async () => {
      // This should have happened automatically in step 3
      // Verify driver assignment
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/trips?id=eq.${this.testData.trip_id}&select=*`, 
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch trip: ${await response.text()}`);
      }

      const trips = await response.json();
      
      if (!trips.length || !trips[0].driver_id) {
        throw new Error('Driver not assigned to trip');
      }

      return trips[0];
    });
  }

  private async step5_processPayment(): Promise<any> {
    await this.executeStep('Process Payment', async () => {
      // Simulate MoMo webhook callback
      const response = await fetch(`${SUPABASE_URL}/functions/v1/momo-webhook`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transaction_id: 'TEST_TX_' + Date.now(),
          amount: 1500,
          status: 'completed',
          phone_number: this.testData.passenger.phone,
          reference: this.testData.trip_id
        })
      });

      if (!response.ok) {
        throw new Error(`Payment processing failed: ${await response.text()}`);
      }

      const paymentData = await response.json();
      
      if (!paymentData.success) {
        throw new Error('Payment webhook processing failed');
      }

      return paymentData;
    });
  }

  private async step6_submitRating(): Promise<any> {
    await this.executeStep('Submit Rating', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rating-handler`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trip_id: this.testData.trip_id,
          passenger_id: this.testData.passenger.id,
          driver_id: this.testData.driver.id,
          stars: 5,
          tip_amount: 200,
          feedback: 'Great ride, very professional driver!'
        })
      });

      if (!response.ok) {
        throw new Error(`Rating submission failed: ${await response.text()}`);
      }

      const ratingData = await response.json();
      
      if (!ratingData.success) {
        throw new Error('Rating submission failed');
      }

      return ratingData;
    });
  }

  private async step7_cleanup(): Promise<any> {
    await this.executeStep('Cleanup Test Data', async () => {
      // Clean up test data (in reverse order)
      const cleanupTasks = [
        // Delete trip ratings
        fetch(`${SUPABASE_URL}/rest/v1/trip_ratings?trip_id=eq.${this.testData.trip_id}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }),
        // Delete trips
        fetch(`${SUPABASE_URL}/rest/v1/trips?id=eq.${this.testData.trip_id}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }),
        // Delete ride requests
        fetch(`${SUPABASE_URL}/rest/v1/ride_requests?id=eq.${this.testData.ride_request_id}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }),
        // Delete test passenger
        fetch(`${SUPABASE_URL}/rest/v1/passengers?id=eq.${this.testData.passenger.id}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }),
        // Delete test driver
        fetch(`${SUPABASE_URL}/rest/v1/drivers?id=eq.${this.testData.driver.id}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        })
      ];

      await Promise.all(cleanupTasks);
      return { cleaned: cleanupTasks.length };
    });
  }

  private printResults(): void {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${Math.round((passed / this.results.length) * 100)}%\n`);
    
    this.results.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.step} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('\n🏁 Test suite completed!');
  }
}

// Performance Test for Realtime Subscriptions
class RealtimeStressTest {
  private supabaseUrl = SUPABASE_URL;
  private supabaseKey = SUPABASE_ANON_KEY;
  
  async runStressTest(concurrentConnections = 100): Promise<void> {
    console.log(`🔥 Starting Realtime Stress Test (${concurrentConnections} connections)...`);
    
    const connections: WebSocket[] = [];
    const results = {
      connected: 0,
      errors: 0,
      messages: 0
    };
    
    // Create concurrent WebSocket connections
    for (let i = 0; i < concurrentConnections; i++) {
      try {
        const ws = new WebSocket(
          `wss://ijblirphkrrsnxazohwt.supabase.co/realtime/v1/websocket?apikey=${this.supabaseKey}&vsn=1.0.0`
        );
        
        ws.onopen = () => {
          results.connected++;
          
          // Subscribe to ride_requests changes
          ws.send(JSON.stringify({
            topic: 'realtime:public:ride_requests',
            event: 'phx_join',
            payload: {},
            ref: i.toString()
          }));
        };
        
        ws.onmessage = (event) => {
          results.messages++;
        };
        
        ws.onerror = () => {
          results.errors++;
        };
        
        connections.push(ws);
        
        // Small delay between connections
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        results.errors++;
      }
    }
    
    // Wait for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Clean up connections
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    console.log('\n📊 REALTIME STRESS TEST RESULTS');
    console.log('='.repeat(40));
    console.log(`Target Connections: ${concurrentConnections}`);
    console.log(`✅ Successfully Connected: ${results.connected}`);
    console.log(`❌ Connection Errors: ${results.errors}`);
    console.log(`📨 Messages Received: ${results.messages}`);
    console.log(`📈 Success Rate: ${Math.round((results.connected / concurrentConnections) * 100)}%`);
  }
}

// Main execution
if (import.meta.main) {
  const tester = new PassengerFlowTester();
  await tester.runFullTest();
  
  // Run smaller realtime test (adjust number for full stress test)
  const realtimeTester = new RealtimeStressTest();
  await realtimeTester.runStressTest(50); // Use 1000 for full stress test
}