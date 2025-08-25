# Costs and Quotas

API usage is tracked with `lib/aiCostTracker.ts`, which records tokens and dollar amounts per model.
A Bottleneck-based rate limiter in `lib/rateLimiter.ts` ensures requests stay within provider quotas.

Monitor accumulated cost totals weekly and adjust limits or budgets as needed.
