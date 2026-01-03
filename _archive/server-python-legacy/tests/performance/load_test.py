"""
Performance Load Testing for AI Agents
Tests concurrent requests, latency, and throughput
"""
import asyncio
import time
import statistics
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor
import sys

sys.path.insert(0, '/Users/jeanbosco/workspace/prisma')

from server.agents.tool_registry import get_tool_handler

class PerformanceMetrics:
    def __init__(self):
        self.latencies: List[float] = []
        self.errors: List[str] = []
        self.start_time: float = 0
        self.end_time: float = 0

    def add_latency(self, latency: float):
        self.latencies.append(latency)

    def add_error(self, error: str):
        self.errors.append(error)

    def calculate_stats(self) -> Dict[str, Any]:
        if not self.latencies:
            return {"error": "No successful requests"}

        total_time = self.end_time - self.start_time
        return {
            "total_requests": len(self.latencies) + len(self.errors),
            "successful_requests": len(self.latencies),
            "failed_requests": len(self.errors),
            "success_rate": len(self.latencies) / (len(self.latencies) + len(self.errors)) * 100,
            "total_duration_seconds": total_time,
            "requests_per_second": len(self.latencies) / total_time if total_time > 0 else 0,
            "latency_stats": {
                "min_ms": min(self.latencies) * 1000,
                "max_ms": max(self.latencies) * 1000,
                "mean_ms": statistics.mean(self.latencies) * 1000,
                "median_ms": statistics.median(self.latencies) * 1000,
                "p95_ms": statistics.quantiles(self.latencies, n=20)[18] * 1000 if len(self.latencies) > 20 else max(self.latencies) * 1000,
                "p99_ms": statistics.quantiles(self.latencies, n=100)[98] * 1000 if len(self.latencies) > 100 else max(self.latencies) * 1000,
            }
        }

def execute_tool_call(tool_name: str, args: Dict[str, Any]) -> float:
    """Execute a single tool call and return latency"""
    start = time.time()
    try:
        handler = get_tool_handler(tool_name)
        handler(**args)
        return time.time() - start
    except Exception as e:
        raise Exception(f"Tool execution failed: {str(e)}")

async def load_test_tax_tools(num_requests: int = 100, concurrency: int = 10):
    """Load test tax calculation tools"""
    print(f"\n[Tax Tools Load Test]")
    print(f"Requests: {num_requests}, Concurrency: {concurrency}")

    metrics = PerformanceMetrics()
    metrics.start_time = time.time()

    # Test data
    test_cases = [
        ("calculate_corporate_tax", {"profit_before_tax": 100000, "adjustments": {}}),
        ("calculate_malta_tax_refund", {"income_amount": 65000, "income_type": "trading", "foreign_tax_paid": 0}),
        ("calculate_rwanda_cit", {"turnover": 50000000, "expenses": 30000000, "industry": "general"}),
    ]

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = []
        for i in range(num_requests):
            tool_name, args = test_cases[i % len(test_cases)]
            future = executor.submit(execute_tool_call, tool_name, args)
            futures.append(future)

        for future in futures:
            try:
                latency = future.result()
                metrics.add_latency(latency)
            except Exception as e:
                metrics.add_error(str(e))

    metrics.end_time = time.time()
    return metrics.calculate_stats()

async def load_test_audit_tools(num_requests: int = 100, concurrency: int = 10):
    """Load test audit calculation tools"""
    print(f"\n[Audit Tools Load Test]")
    print(f"Requests: {num_requests}, Concurrency: {concurrency}")

    metrics = PerformanceMetrics()
    metrics.start_time = time.time()

    # Test data
    test_cases = [
        ("calculate_materiality", {"revenue": 5000000, "profit_before_tax": 500000, "total_assets": 2000000}),
        ("assess_inherent_risk", {"account_balance": "Revenue", "complexity": "high", "subjectivity": "medium", "change_factor": "system_change"}),
    ]

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = []
        for i in range(num_requests):
            tool_name, args = test_cases[i % len(test_cases)]
            future = executor.submit(execute_tool_call, tool_name, args)
            futures.append(future)

        for future in futures:
            try:
                latency = future.result()
                metrics.add_latency(latency)
            except Exception as e:
                metrics.add_error(str(e))

    metrics.end_time = time.time()
    return metrics.calculate_stats()

def print_results(test_name: str, stats: Dict[str, Any]):
    """Print formatted test results"""
    print(f"\n{'='*60}")
    print(f"{test_name} - Results")
    print(f"{'='*60}")
    print(f"Total Requests:      {stats['total_requests']}")
    print(f"Successful:          {stats['successful_requests']}")
    print(f"Failed:              {stats['failed_requests']}")
    print(f"Success Rate:        {stats['success_rate']:.2f}%")
    print(f"Duration:            {stats['total_duration_seconds']:.2f}s")
    print(f"Throughput:          {stats['requests_per_second']:.2f} req/s")
    print(f"\nLatency Statistics:")
    print(f"  Min:               {stats['latency_stats']['min_ms']:.2f}ms")
    print(f"  Max:               {stats['latency_stats']['max_ms']:.2f}ms")
    print(f"  Mean:              {stats['latency_stats']['mean_ms']:.2f}ms")
    print(f"  Median:            {stats['latency_stats']['median_ms']:.2f}ms")
    print(f"  P95:               {stats['latency_stats']['p95_ms']:.2f}ms")
    print(f"  P99:               {stats['latency_stats']['p99_ms']:.2f}ms")
    print(f"{'='*60}\n")

async def main():
    """Run all performance tests"""
    print("\n" + "="*60)
    print("AI Agent Performance Testing Suite")
    print("="*60)

    # Test configurations
    configs = [
        {"num_requests": 50, "concurrency": 5},
        {"num_requests": 100, "concurrency": 10},
        {"num_requests": 200, "concurrency": 20},
    ]

    for config in configs:
        print(f"\n\n>>> Configuration: {config['num_requests']} requests, {config['concurrency']} concurrent")

        # Tax tools
        tax_stats = await load_test_tax_tools(**config)
        print_results("Tax Tools", tax_stats)

        # Audit tools
        audit_stats = await load_test_audit_tools(**config)
        print_results("Audit Tools", audit_stats)

        # Brief pause between configs
        await asyncio.sleep(1)

    print("\n" + "="*60)
    print("Performance Testing Complete")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())
