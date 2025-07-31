import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test database setup
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'test-key';

export const testSupabase = createClient(supabaseUrl, supabaseKey);

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up integration test environment...');
  
  // Clean test database
  await cleanDatabase();
  
  // Seed test data
  await seedTestData();
});

afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...');
  await cleanDatabase();
});

beforeEach(async () => {
  // Reset state before each test
  await resetTestState();
});

afterEach(async () => {
  // Clean up after each test
  await cleanupTestData();
});

async function cleanDatabase() {
  // Clean test tables (be careful not to clean production data)
  const tables = [
    'agent_execution_log',
    'conversations',
    'conversation_messages',
    'automated_tasks',
    'agent_memory'
  ];
  
  for (const table of tables) {
    await testSupabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
}

async function seedTestData() {
  // Insert minimal test data needed for integration tests
  const testUser = {
    id: 'test-user-123',
    phone: '+250788767816',
    created_at: new Date().toISOString()
  };
  
  await testSupabase.from('whatsapp_contacts').upsert(testUser);
}

async function resetTestState() {
  // Reset any state that might affect tests
}

async function cleanupTestData() {
  // Clean up any data created during tests
}