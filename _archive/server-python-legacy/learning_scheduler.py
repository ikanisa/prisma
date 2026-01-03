"""
Learning System Job Scheduler
Configures periodic execution of learning jobs using RQ Scheduler
"""

from datetime import datetime, timedelta
from rq_scheduler import Scheduler
import redis
import os

from server.learning_jobs import (
    optimize_agent_prompts,
    train_rag_embeddings,
    analyze_ab_tests,
    cleanup_old_feedback,
    generate_learning_report
)

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_conn = redis.from_url(redis_url)

# Create scheduler
scheduler = Scheduler(connection=redis_conn)


def setup_learning_jobs():
    """
    Setup all periodic learning jobs
    """
    print("[Scheduler] Setting up learning system jobs...")
    
    # Clear any existing jobs (for clean restart)
    for job in scheduler.get_jobs():
        if job.meta.get('learning_system'):
            scheduler.cancel(job)
    
    # 1. Prompt Optimization - Weekly on Monday at 2 AM
    scheduler.cron(
        "0 2 * * 1",  # Every Monday at 2 AM
        func=optimize_agent_prompts,
        queue_name="optimization",
        meta={"learning_system": True, "job_type": "prompt_optimization"}
    )
    print("[Scheduler] ✓ Prompt optimization scheduled (Weekly, Monday 2 AM)")
    
    # 2. RAG Training Check - Daily at 3 AM
    scheduler.cron(
        "0 3 * * *",  # Every day at 3 AM
        func=train_rag_embeddings,
        queue_name="learning",
        meta={"learning_system": True, "job_type": "rag_training"}
    )
    print("[Scheduler] ✓ RAG training scheduled (Daily, 3 AM)")
    
    # 3. A/B Test Analysis - Every hour
    scheduler.cron(
        "0 * * * *",  # Every hour at minute 0
        func=analyze_ab_tests,
        queue_name="learning",
        meta={"learning_system": True, "job_type": "ab_test_analysis"}
    )
    print("[Scheduler] ✓ A/B test analysis scheduled (Hourly)")
    
    # 4. Cleanup - Weekly on Sunday at 1 AM
    scheduler.cron(
        "0 1 * * 0",  # Every Sunday at 1 AM
        func=cleanup_old_feedback,
        queue_name="learning",
        meta={"learning_system": True, "job_type": "cleanup"}
    )
    print("[Scheduler] ✓ Cleanup scheduled (Weekly, Sunday 1 AM)")
    
    # 5. Learning Report - Weekly on Monday at 9 AM
    scheduler.cron(
        "0 9 * * 1",  # Every Monday at 9 AM
        func=generate_learning_report,
        queue_name="learning",
        meta={"learning_system": True, "job_type": "learning_report"}
    )
    print("[Scheduler] ✓ Learning report scheduled (Weekly, Monday 9 AM)")
    
    print(f"[Scheduler] All learning jobs configured. Total jobs: {len(list(scheduler.get_jobs()))}")


def run_job_now(job_type: str):
    """
    Manually trigger a job to run immediately
    """
    jobs = {
        "prompt_optimization": optimize_agent_prompts,
        "rag_training": train_rag_embeddings,
        "ab_test_analysis": analyze_ab_tests,
        "cleanup": cleanup_old_feedback,
        "learning_report": generate_learning_report
    }
    
    if job_type not in jobs:
        print(f"Unknown job type: {job_type}")
        return None
    
    print(f"[Scheduler] Running {job_type} immediately...")
    job = scheduler.enqueue(jobs[job_type])
    print(f"[Scheduler] Job enqueued: {job.id}")
    return job


def get_job_status():
    """
    Get status of all scheduled learning jobs
    """
    jobs = list(scheduler.get_jobs())
    learning_jobs = [j for j in jobs if j.meta.get('learning_system')]
    
    status = {
        "total_jobs": len(learning_jobs),
        "jobs": []
    }
    
    for job in learning_jobs:
        status["jobs"].append({
            "id": job.id,
            "type": job.meta.get('job_type'),
            "func": job.func_name,
            "next_run": job.meta.get('scheduled_for'),
            "interval": job.meta.get('interval')
        })
    
    return status


if __name__ == "__main__":
    """
    Setup scheduler when run directly
    """
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "setup":
            setup_learning_jobs()
        elif command == "status":
            status = get_job_status()
            print(f"Learning Jobs Status:")
            print(f"Total: {status['total_jobs']}")
            for job in status['jobs']:
                print(f"  - {job['type']}: Next run at {job['next_run']}")
        elif command == "run":
            if len(sys.argv) < 3:
                print("Usage: python -m server.learning_scheduler run <job_type>")
                sys.exit(1)
            job_type = sys.argv[2]
            run_job_now(job_type)
        else:
            print(f"Unknown command: {command}")
            print("Available commands: setup, status, run")
            sys.exit(1)
    else:
        # Default: setup jobs
        setup_learning_jobs()
        print("[Scheduler] Scheduler is running. Press Ctrl+C to exit.")
        
        # Keep running
        try:
            import time
            while True:
                time.sleep(60)
        except KeyboardInterrupt:
            print("\n[Scheduler] Shutting down...")
