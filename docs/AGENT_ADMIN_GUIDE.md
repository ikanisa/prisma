# AI Agent Admin Guide

## Overview

This guide covers administration, configuration, and monitoring of Prisma Glow's AI agent system.

## Architecture

### Components

```
┌─────────────────┐
│   Frontend UI   │
│  (Next.js/React)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Gateway   │
│ /api/agents/v2  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│  Agent Registry │────▶│  Tool Registry│
└────────┬────────┘     └──────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│   Providers     │────▶│   Database   │
│ (OpenAI/Gemini) │     │  (Supabase)  │
└─────────────────┘     └──────────────┘
```

### Database Schema

**agent_executions**
- Tracks all agent runs
- Stores input/output
- Records tool calls
- Logs errors

**agent_conversations**
- Groups related messages
- Links to users/orgs
- Maintains context

**agent_audit_log**
- Compliance tracking
- PII access logs
- Security events

## Configuration

### Environment Variables

```bash
# AI Providers
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...

# Database
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...

# Monitoring
PROMETHEUS_ENABLED=true
SENTRY_DSN=https://...

# Rate Limiting
RATE_LIMIT_PER_USER=100
RATE_LIMIT_WINDOW_SECONDS=60

# Cost Controls
MONTHLY_COST_LIMIT_USD=1000
ALERT_THRESHOLD_USD=800
```

### Agent Registration

Agents are auto-registered from code. To add a new agent:

1. Create agent definition in `server/agents/`
2. Implement required tools
3. Register in `tool_registry.py`
4. Restart server

Example:
```python
from server.agents.base import Agent, AgentConfig

config = AgentConfig(
    id="custom-agent-001",
    name="Custom Agent",
    description="Specialized agent",
    domain="custom",
    model="gpt-4",
    temperature=0.1,
    tools=["tool1", "tool2"]
)

agent = Agent(config)
```

## Monitoring

### Metrics (Prometheus)

**agent_executions_total**
- Counter of total executions
- Labels: agent_id, status, domain

**agent_execution_duration_seconds**
- Histogram of execution times
- Labels: agent_id, domain

**agent_tokens_used_total**
- Counter of tokens consumed
- Labels: agent_id, model

**agent_cost_usd_total**
- Counter of costs
- Labels: agent_id, model

**agent_errors_total**
- Counter of errors
- Labels: agent_id, error_type

### Dashboards

Import Grafana dashboards from `monitoring/grafana/`:
- Agent Performance
- Cost Tracking
- Error Rates
- User Activity

### Alerts

Configure alerts for:
- High error rates (>5%)
- Slow responses (P95 >5s)
- Cost overruns
- Rate limit violations

## Performance Tuning

### Latency Optimization

1. **Model Selection**
   - Use GPT-3.5-turbo for simple tasks
   - Reserve GPT-4 for complex reasoning

2. **Caching**
   - Enable response caching for common queries
   - Cache tool results when appropriate

3. **Parallel Execution**
   - Run independent tool calls in parallel
   - Use async/await properly

### Cost Optimization

1. **Token Management**
   - Trim conversation history
   - Use system prompts efficiently
   - Compress tool outputs

2. **Model Tiering**
   - Route simple queries to cheaper models
   - Use function calling judiciously

3. **Rate Limiting**
   - Implement per-user quotas
   - Set org-level budgets

## Security

### Access Control

**Row Level Security (RLS)**
```sql
-- Users can only access their org's data
CREATE POLICY org_isolation ON agent_executions
  FOR SELECT USING (org_id = auth.jwt() ->> 'org_id');
```

**API Authentication**
- Require valid JWT tokens
- Validate org membership
- Check user permissions

### PII Protection

**Detection**
- Email addresses
- Phone numbers
- SSNs/Tax IDs
- Credit card numbers

**Masking**
```python
from server.agents.security import mask_pii

masked_text = mask_pii(user_input)
# "My email is john@example.com" → "My email is [EMAIL]"
```

### Audit Logging

All sensitive operations are logged:
- Agent executions
- Tool calls with PII
- Configuration changes
- Access violations

## Troubleshooting

### Common Issues

**1. Agent Not Responding**
- Check API keys
- Verify network connectivity
- Review rate limits
- Check error logs

**2. Incorrect Results**
- Validate tool implementations
- Check input data quality
- Review model temperature
- Test with simpler queries

**3. High Costs**
- Analyze token usage
- Review conversation lengths
- Check for retry loops
- Implement caching

**4. Slow Performance**
- Profile tool execution times
- Check database query performance
- Review network latency
- Optimize prompts

### Debug Mode

Enable debug logging:
```python
import logging
logging.getLogger('server.agents').setLevel(logging.DEBUG)
```

View detailed execution:
```bash
tail -f logs/agent_debug.log
```

## Maintenance

### Regular Tasks

**Daily**
- Monitor error rates
- Check cost trends
- Review performance metrics

**Weekly**
- Analyze user feedback
- Update tool implementations
- Review audit logs

**Monthly**
- Validate domain logic
- Update documentation
- Review security policies

### Updates

**Tool Updates**
1. Test in development
2. Run integration tests
3. Deploy to staging
4. Validate with sample queries
5. Deploy to production
6. Monitor for issues

**Model Updates**
1. Evaluate new models
2. Benchmark performance
3. Test cost impact
4. Update configurations
5. Gradual rollout

## Backup and Recovery

### Database Backups
- Automated daily backups
- 30-day retention
- Point-in-time recovery

### Configuration Backups
- Version control all configs
- Document changes
- Test restore procedures

## Compliance

### GDPR
- Data minimization
- Right to erasure
- Data portability
- Consent management

### SOC 2
- Access controls
- Audit logging
- Encryption
- Incident response

### Industry-Specific
- Tax advisor privilege
- Audit independence
- Professional standards

## Support

### Internal Support
- Slack: #ai-agents
- Email: devops@prismaglow.com

### Vendor Support
- OpenAI: platform.openai.com/support
- Google: cloud.google.com/support

## Appendix

### API Reference
See `docs/API_REFERENCE.md`

### Tool Catalog
See `docs/TOOL_CATALOG.md`

### Runbooks
See `docs/runbooks/`

---

**Questions?** Contact the AI team at ai-team@prismaglow.com
