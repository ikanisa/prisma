#!/usr/bin/env python3
"""
Agent Learning System - Comprehensive Test Suite
Validates all components of the learning system
"""

import asyncio
import asyncpg
import os
import sys
from typing import Dict, List
from datetime import datetime
import json

class LearningSystemTester:
    """Test suite for the agent learning system"""
    
    def __init__(self):
        self.db_url = os.getenv('DATABASE_URL')
        self.db = None
        self.results = []
        
    async def connect(self):
        """Connect to database"""
        try:
            self.db = await asyncpg.connect(self.db_url)
            self.log_success("Database connection established")
            return True
        except Exception as e:
            self.log_error(f"Database connection failed: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from database"""
        if self.db:
            await self.db.close()
    
    def log_success(self, message: str):
        """Log successful test"""
        print(f"✅ {message}")
        self.results.append({"status": "pass", "message": message})
    
    def log_error(self, message: str):
        """Log failed test"""
        print(f"❌ {message}")
        self.results.append({"status": "fail", "message": message})
    
    def log_info(self, message: str):
        """Log informational message"""
        print(f"ℹ️  {message}")
    
    async def test_schema(self) -> bool:
        """Test that all required tables exist"""
        self.log_info("Testing database schema...")
        
        required_tables = [
            'learning_examples',
            'agent_feedback',
            'expert_annotations',
            'training_datasets',
            'dataset_examples',
            'training_runs',
            'learning_experiments'
        ]
        
        all_exist = True
        
        for table in required_tables:
            exists = await self.db.fetchval(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                )
            """, table)
            
            if exists:
                self.log_success(f"Table '{table}' exists")
            else:
                self.log_error(f"Table '{table}' missing")
                all_exist = False
        
        return all_exist
    
    async def test_indexes(self) -> bool:
        """Test that required indexes exist"""
        self.log_info("Testing database indexes...")
        
        required_indexes = [
            'idx_learning_examples_agent',
            'idx_learning_examples_domain',
            'idx_feedback_execution',
            'idx_feedback_agent'
        ]
        
        all_exist = True
        
        for index in required_indexes:
            exists = await self.db.fetchval("""
                SELECT EXISTS (
                    SELECT FROM pg_indexes 
                    WHERE indexname = $1
                )
            """, index)
            
            if exists:
                self.log_success(f"Index '{index}' exists")
            else:
                self.log_error(f"Index '{index}' missing")
                all_exist = False
        
        return all_exist
    
    async def test_feedback_insertion(self) -> bool:
        """Test inserting feedback"""
        self.log_info("Testing feedback insertion...")
        
        try:
            # Get a test agent and execution
            agent = await self.db.fetchrow("""
                SELECT id FROM agents LIMIT 1
            """)
            
            if not agent:
                self.log_error("No agents found for testing")
                return False
            
            # Create test execution
            execution_id = await self.db.fetchval("""
                INSERT INTO agent_executions (
                    agent_id, user_id, input, output, status, created_at
                ) VALUES (
                    $1, 
                    (SELECT id FROM users LIMIT 1),
                    'Test input',
                    'Test output',
                    'completed',
                    NOW()
                )
                RETURNING id
            """, agent['id'])
            
            # Insert test feedback
            feedback_id = await self.db.fetchval("""
                INSERT INTO agent_feedback (
                    execution_id, agent_id, user_id,
                    rating, feedback_type, issue_categories
                ) VALUES (
                    $1, $2,
                    (SELECT id FROM users LIMIT 1),
                    4, 'star_rating', '["test"]'::jsonb
                )
                RETURNING id
            """, execution_id, agent['id'])
            
            if feedback_id:
                self.log_success("Feedback insertion successful")
                
                # Clean up
                await self.db.execute("DELETE FROM agent_feedback WHERE id = $1", feedback_id)
                await self.db.execute("DELETE FROM agent_executions WHERE id = $1", execution_id)
                
                return True
            else:
                self.log_error("Feedback insertion failed")
                return False
                
        except Exception as e:
            self.log_error(f"Feedback insertion test failed: {e}")
            return False
    
    async def test_learning_example_insertion(self) -> bool:
        """Test inserting learning examples"""
        self.log_info("Testing learning example insertion...")
        
        try:
            agent = await self.db.fetchrow("SELECT id FROM agents LIMIT 1")
            
            if not agent:
                self.log_error("No agents found for testing")
                return False
            
            example_id = await self.db.fetchval("""
                INSERT INTO learning_examples (
                    agent_id, example_type, input_text, input_context,
                    expected_output, source_type, domain, task_type
                ) VALUES (
                    $1, 'correction', 'Test input', '{}'::jsonb,
                    'Test output', 'user_feedback', 'test', 'test'
                )
                RETURNING id
            """, agent['id'])
            
            if example_id:
                self.log_success("Learning example insertion successful")
                
                # Clean up
                await self.db.execute("DELETE FROM learning_examples WHERE id = $1", example_id)
                
                return True
            else:
                self.log_error("Learning example insertion failed")
                return False
                
        except Exception as e:
            self.log_error(f"Learning example test failed: {e}")
            return False
    
    async def test_annotation_workflow(self) -> bool:
        """Test annotation workflow"""
        self.log_info("Testing annotation workflow...")
        
        try:
            # Create learning example
            agent = await self.db.fetchrow("SELECT id FROM agents LIMIT 1")
            user = await self.db.fetchrow("SELECT id FROM users LIMIT 1")
            
            if not agent or not user:
                self.log_error("Missing test data (agent or user)")
                return False
            
            example_id = await self.db.fetchval("""
                INSERT INTO learning_examples (
                    agent_id, example_type, input_text, input_context,
                    expected_output, source_type, review_status
                ) VALUES (
                    $1, 'demonstration', 'Test', '{}'::jsonb,
                    'Test output', 'expert_review', 'pending'
                )
                RETURNING id
            """, agent['id'])
            
            # Create annotation
            annotation_id = await self.db.fetchval("""
                INSERT INTO expert_annotations (
                    learning_example_id, expert_id, annotation_type,
                    annotation_data, technical_accuracy,
                    professional_quality, completeness, clarity
                ) VALUES (
                    $1, $2, 'quality_assessment', '{}'::jsonb,
                    0.85, 0.90, 0.88, 0.92
                )
                RETURNING id
            """, example_id, user['id'])
            
            # Update review status
            await self.db.execute("""
                UPDATE learning_examples
                SET review_status = 'approved',
                    reviewed_by = $2,
                    reviewed_at = NOW()
                WHERE id = $1
            """, example_id, user['id'])
            
            # Verify
            example = await self.db.fetchrow("""
                SELECT review_status FROM learning_examples WHERE id = $1
            """, example_id)
            
            if example and example['review_status'] == 'approved':
                self.log_success("Annotation workflow successful")
                
                # Clean up
                await self.db.execute("DELETE FROM expert_annotations WHERE id = $1", annotation_id)
                await self.db.execute("DELETE FROM learning_examples WHERE id = $1", example_id)
                
                return True
            else:
                self.log_error("Annotation workflow failed")
                return False
                
        except Exception as e:
            self.log_error(f"Annotation workflow test failed: {e}")
            return False
    
    async def test_dataset_creation(self) -> bool:
        """Test training dataset creation"""
        self.log_info("Testing dataset creation...")
        
        try:
            agent = await self.db.fetchrow("SELECT id FROM agents LIMIT 1")
            
            if not agent:
                self.log_error("No agents found for testing")
                return False
            
            # Create dataset
            dataset_id = await self.db.fetchval("""
                INSERT INTO training_datasets (
                    name, description, version, agent_ids,
                    status, created_by
                ) VALUES (
                    'Test Dataset', 'Test', '1.0', $1::jsonb,
                    'draft', (SELECT id FROM users LIMIT 1)
                )
                RETURNING id
            """, json.dumps([str(agent['id'])]))
            
            if dataset_id:
                self.log_success("Dataset creation successful")
                
                # Clean up
                await self.db.execute("DELETE FROM training_datasets WHERE id = $1", dataset_id)
                
                return True
            else:
                self.log_error("Dataset creation failed")
                return False
                
        except Exception as e:
            self.log_error(f"Dataset creation test failed: {e}")
            return False
    
    async def test_experiment_creation(self) -> bool:
        """Test A/B experiment creation"""
        self.log_info("Testing experiment creation...")
        
        try:
            agent = await self.db.fetchrow("SELECT id FROM agents LIMIT 1")
            user = await self.db.fetchrow("SELECT id FROM users LIMIT 1")
            
            if not agent or not user:
                self.log_error("Missing test data")
                return False
            
            experiment_id = await self.db.fetchval("""
                INSERT INTO learning_experiments (
                    name, description, hypothesis, agent_id,
                    control_config, treatment_config,
                    status, created_by
                ) VALUES (
                    'Test Experiment', 'Test', 'Test hypothesis', $1,
                    '{}'::jsonb, '{}'::jsonb,
                    'draft', $2
                )
                RETURNING id
            """, agent['id'], user['id'])
            
            if experiment_id:
                self.log_success("Experiment creation successful")
                
                # Clean up
                await self.db.execute("DELETE FROM learning_experiments WHERE id = $1", experiment_id)
                
                return True
            else:
                self.log_error("Experiment creation failed")
                return False
                
        except Exception as e:
            self.log_error(f"Experiment creation test failed: {e}")
            return False
    
    async def test_feedback_stats_query(self) -> bool:
        """Test feedback statistics query"""
        self.log_info("Testing feedback statistics query...")
        
        try:
            agent = await self.db.fetchrow("SELECT id FROM agents LIMIT 1")
            
            if not agent:
                self.log_error("No agents found for testing")
                return False
            
            stats = await self.db.fetchrow("""
                SELECT 
                    COUNT(*) as total_feedback,
                    AVG(rating) as avg_rating,
                    COUNT(DISTINCT user_id) as unique_users
                FROM agent_feedback
                WHERE agent_id = $1
                  AND created_at > NOW() - INTERVAL '30 days'
            """, agent['id'])
            
            if stats is not None:
                self.log_success(f"Feedback stats query successful (total: {stats['total_feedback']})")
                return True
            else:
                self.log_error("Feedback stats query failed")
                return False
                
        except Exception as e:
            self.log_error(f"Feedback stats query test failed: {e}")
            return False
    
    async def test_annotation_queue_query(self) -> bool:
        """Test annotation queue query"""
        self.log_info("Testing annotation queue query...")
        
        try:
            queue = await self.db.fetch("""
                SELECT 
                    id, agent_id, example_type, domain, task_type,
                    input_text, expected_output, quality_score
                FROM learning_examples
                WHERE review_status = 'pending'
                  AND is_active = true
                ORDER BY created_at ASC
                LIMIT 10
            """)
            
            self.log_success(f"Annotation queue query successful ({len(queue)} pending)")
            return True
                
        except Exception as e:
            self.log_error(f"Annotation queue query test failed: {e}")
            return False
    
    async def test_dataset_stats(self) -> bool:
        """Test dataset statistics"""
        self.log_info("Testing dataset statistics...")
        
        try:
            stats = await self.db.fetchrow("""
                SELECT 
                    COUNT(*) as total_datasets,
                    COUNT(*) FILTER (WHERE status = 'ready') as ready_datasets,
                    SUM(total_examples) as total_examples
                FROM training_datasets
            """)
            
            if stats is not None:
                self.log_success(f"Dataset stats successful (total: {stats['total_datasets']})")
                return True
            else:
                self.log_error("Dataset stats query failed")
                return False
                
        except Exception as e:
            self.log_error(f"Dataset stats test failed: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("AGENT LEARNING SYSTEM - TEST SUITE")
        print("="*60 + "\n")
        
        if not await self.connect():
            print("\n❌ Cannot proceed without database connection")
            return False
        
        tests = [
            ("Schema", self.test_schema),
            ("Indexes", self.test_indexes),
            ("Feedback Insertion", self.test_feedback_insertion),
            ("Learning Example Insertion", self.test_learning_example_insertion),
            ("Annotation Workflow", self.test_annotation_workflow),
            ("Dataset Creation", self.test_dataset_creation),
            ("Experiment Creation", self.test_experiment_creation),
            ("Feedback Stats Query", self.test_feedback_stats_query),
            ("Annotation Queue Query", self.test_annotation_queue_query),
            ("Dataset Stats", self.test_dataset_stats),
        ]
        
        results = {"pass": 0, "fail": 0}
        
        for test_name, test_func in tests:
            print(f"\n--- {test_name} ---")
            try:
                result = await test_func()
                if result:
                    results["pass"] += 1
                else:
                    results["fail"] += 1
            except Exception as e:
                self.log_error(f"Test crashed: {e}")
                results["fail"] += 1
        
        await self.disconnect()
        
        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"✅ Passed: {results['pass']}/{len(tests)}")
        print(f"❌ Failed: {results['fail']}/{len(tests)}")
        print(f"Success Rate: {(results['pass']/len(tests)*100):.1f}%")
        print("="*60 + "\n")
        
        return results["fail"] == 0

async def main():
    """Main test runner"""
    tester = LearningSystemTester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
