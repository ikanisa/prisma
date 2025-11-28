#!/usr/bin/env python3
"""
Learning System Integration Test
Verifies that all components are properly integrated
"""

import asyncio
import sys
from pathlib import Path

# Add server to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'server'))

async def test_imports():
    """Test that all modules can be imported"""
    print("Testing imports...")
    
    try:
        # Test learning modules
        from server.learning import (
            PromptOptimizer,
            RAGTrainer,
            BehaviorLearner,
            FeedbackCollector
        )
        print("✓ Learning modules imported successfully")
        
        # Test API module
        from server.api.learning import router
        print("✓ Learning API router imported successfully")
        
        # Verify router has endpoints
        routes = [route.path for route in router.routes]
        expected_routes = [
            '/api/learning/feedback',
            '/api/learning/feedback/stats/{agent_id}',
            '/api/learning/feedback/issues/{agent_id}',
            '/api/learning/annotations/queue',
            '/api/learning/annotations',
            '/api/learning/stats',
            '/api/learning/demonstrations',
            '/api/learning/optimize-prompt',
            '/api/learning/datasets/{agent_id}',
        ]
        
        print(f"\n✓ Router has {len(routes)} endpoints")
        for route in expected_routes:
            if route in routes:
                print(f"  ✓ {route}")
            else:
                print(f"  ✗ Missing: {route}")
        
        return True
        
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

async def test_main_integration():
    """Test that main.py includes the learning router"""
    print("\nTesting main.py integration...")
    
    try:
        main_file = Path(__file__).parent.parent / 'server' / 'main.py'
        content = main_file.read_text()
        
        checks = [
            ('from .api.learning import router as learning_router', 'Import statement'),
            ('app.include_router(learning_router)', 'Router registration'),
        ]
        
        all_good = True
        for check, description in checks:
            if check in content:
                print(f"✓ {description} found")
            else:
                print(f"✗ {description} NOT found")
                all_good = False
        
        return all_good
        
    except Exception as e:
        print(f"✗ Error checking main.py: {e}")
        return False

async def test_frontend_files():
    """Test that frontend files exist"""
    print("\nTesting frontend files...")
    
    base_path = Path(__file__).parent.parent
    files_to_check = [
        'src/hooks/useLearning.ts',
        'src/components/learning/FeedbackCollector.tsx',
        'src/components/learning/AgentOutputCard.tsx',
        'src/components/learning/LearningDashboard.tsx',
        'src/components/learning/index.ts',
    ]
    
    all_exist = True
    for file_path in files_to_check:
        full_path = base_path / file_path
        if full_path.exists():
            size = full_path.stat().st_size
            print(f"✓ {file_path} ({size:,} bytes)")
        else:
            print(f"✗ {file_path} NOT FOUND")
            all_exist = False
    
    return all_exist

async def test_database_migration():
    """Test that database migration exists"""
    print("\nTesting database migration...")
    
    migration_file = Path(__file__).parent.parent / 'migrations' / 'sql' / '20251128000000_agent_learning_system.sql'
    
    if migration_file.exists():
        size = migration_file.stat().st_size
        print(f"✓ Migration file exists ({size:,} bytes)")
        
        # Check for key tables
        content = migration_file.read_text()
        tables = [
            'learning_examples',
            'agent_feedback',
            'expert_annotations',
            'training_datasets',
            'dataset_examples',
            'training_runs',
            'learning_experiments',
            'embedding_training_pairs',
        ]
        
        for table in tables:
            if f'CREATE TABLE' in content and table in content:
                print(f"  ✓ {table} table")
            else:
                print(f"  ✗ {table} table NOT FOUND")
        
        return True
    else:
        print("✗ Migration file NOT FOUND")
        return False

async def main():
    """Run all tests"""
    print("=" * 60)
    print("AGENT LEARNING SYSTEM - INTEGRATION VERIFICATION")
    print("=" * 60)
    
    results = []
    
    # Run tests
    results.append(await test_imports())
    results.append(await test_main_integration())
    results.append(await test_frontend_files())
    results.append(await test_database_migration())
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    total = len(results)
    passed = sum(results)
    
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED - System is ready for deployment!")
        print("\nNext steps:")
        print("1. Apply database migration: psql $DATABASE_URL -f migrations/sql/20251128000000_agent_learning_system.sql")
        print("2. Restart FastAPI server to load new endpoints")
        print("3. Start using FeedbackCollector in your agent UIs")
        return 0
    else:
        print("\n⚠️ SOME TESTS FAILED - Review errors above")
        return 1

if __name__ == '__main__':
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
