# API Documentation - Prisma Glow

**Base URL:** `https://api.prismaglow.com`  
**Version:** 1.0.0

---

## Authentication

All API requests require authentication via API key:

```http
GET /api/agents/tax
X-API-Key: your-api-key-here
```

---

## Tax Agents API

### List All Tax Agents
```http
GET /api/agents/tax/
```

**Response:**
```json
[
  {
    "agent_id": "tax-corp-us-050",
    "name": "US Corporate Tax Specialist",
    "category": "corporate-tax",
    "jurisdictions": ["US", "US-FEDERAL", "US-CA", ...]
  }
]
```

### Query Tax Agent
```http
POST /api/agents/tax/{agent_id}/query
Content-Type: application/json

{
  "query": "What is the corporate tax rate?",
  "context": {
    "jurisdiction": "US",
    "year": 2024
  }
}
```

**Response:**
```json
{
  "agent_id": "tax-corp-us-050",
  "guidance": "The US federal corporate tax rate is 21%...",
  "citations": [...],
  "confidence": 0.95
}
```

---

## Accounting Agents API

### List All Accounting Agents
```http
GET /api/agents/accounting/
```

### Query Accounting Agent
```http
POST /api/agents/accounting/{agent_id}/query
```

**Response includes:**
- `accounting_entries`: Suggested journal entries
- `standards`: Applicable IFRS/GAAP standards
- `citations`: Standard references

---

## Analytics API

### Get Dashboard Data
```http
GET /api/analytics/dashboard
```

**Response:**
```json
{
  "usage_stats": {
    "total_queries": 1234,
    "success_rate": 0.956
  },
  "performance_metrics": {...},
  "popular_queries": [...]
}
```

---

## Rate Limits

- **Free tier:** 100 requests/minute
- **Pro tier:** 1000 requests/minute
- **Enterprise:** Unlimited

**Headers:**
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Agent Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Server Error |

---

## SDK Examples

### Python
```python
import requests

response = requests.post(
    "https://api.prismaglow.com/api/agents/tax/tax-corp-us-050/query",
    headers={"X-API-Key": "your-key"},
    json={"query": "What is the corporate tax rate?"}
)
print(response.json())
```

### JavaScript
```javascript
const response = await fetch('/api/agents/tax/tax-corp-us-050/query', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'What is the corporate tax rate?'
  })
});
const data = await response.json();
```
