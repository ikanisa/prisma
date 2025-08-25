"""APScheduler configuration for analytics jobs."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .jobs import (
    reembed_job,
    anomaly_scan_job,
    policy_check_job,
)

scheduler = AsyncIOScheduler()

# Register jobs with simple schedules; adjust as needed for production.
scheduler.add_job(reembed_job, "cron", hour=0)
scheduler.add_job(anomaly_scan_job, "interval", minutes=30)
scheduler.add_job(policy_check_job, "interval", hours=1)

def start_scheduler() -> None:
    """Start the APScheduler instance."""
    if not scheduler.running:
        scheduler.start()
