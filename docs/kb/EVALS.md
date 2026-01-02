# Knowledge Factory Evaluation Framework

## Overview

This document describes the evaluation framework for measuring Knowledge Factory retrieval quality and groundedness.

---

## Golden Questions

Location: `evals/kb/questions.json`

### Question Categories

| Category | Count | Topics |
|----------|-------|--------|
| IFRS | 3 | Revenue (IFRS 15), Leases (IFRS 16), Deferred Tax (IAS 12) |
| ISA | 2 | Audit Evidence (ISA 500), Going Concern (ISA 570) |
| Tax - Malta | 1 | Corporate tax rates, refund mechanisms |
| Tax - Rwanda | 1 | VAT rates, exemptions |
| Transfer Pricing | 1 | Arm's length principle |

### Difficulty Levels

- **Basic**: Direct factual questions
- **Intermediate**: Requires understanding of concepts
- **Advanced**: Complex reasoning across multiple documents

---

## Evaluation Metrics

### Retrieval Score (0-1)

Measures how well the retriever finds relevant documents:

```
retrieval_score = (pattern_match_rate + count_score) / 2

pattern_match_rate = matched_patterns / expected_patterns
count_score = min(1, retrieved_count / expected_min_results)
```

### Groundedness Score (0-1)

Measures how well the answer is grounded in retrieved chunks:

- 1.0: All claims cite retrieved chunks
- 0.5: Some claims unsupported
- 0.0: No relevant chunks retrieved

### Pass Criteria

A question **passes** if:
- `retrieval_score >= 0.5`
- All expected patterns matched
- At least one relevant chunk retrieved

---

## Running Evaluations

### Full Evaluation

```bash
# Run against production data
pnpm eval:kb <org-id>

# Output: evals/kb/report-<timestamp>.json
#         evals/kb/report-<timestamp>.md
```

### CI Smoke Test

```bash
# Quick subset for PRs
pnpm eval:kb:smoke <org-id>
```

### Expected Output

```
[EVAL] Starting KB evaluation for org xxx...
[EVAL] Loaded 8 questions
[EVAL] Testing: ifrs15-revenue-recognition...
  ✓ Retrieval: 0.85
[EVAL] Testing: ias12-deferred-tax...
  ✓ Retrieval: 0.90
...

=== EVALUATION SUMMARY ===
Total: 8
Passed: 7 (87.5%)
Failed: 1
Avg Retrieval Score: 0.82
Avg Groundedness Score: 0.78
```

---

## Adding New Questions

1. Edit `evals/kb/questions.json`
2. Follow schema:

```json
{
  "id": "unique-question-id",
  "question": "Natural language question",
  "expectedFilters": {
    "standard": "IFRS|ISA|GAAP|TAX",
    "jurisdiction": "Malta|Rwanda|EU|US"
  },
  "expectedCitations": {
    "documentPatterns": ["keyword1", "keyword2"],
    "minResults": 1
  },
  "expectedKeyPoints": ["point1", "point2"],
  "difficulty": "basic|intermediate|advanced"
}
```

3. Run eval to verify new question passes

---

## Interpreting Results

### Healthy Scores

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Pass Rate | > 80% | 60-80% | < 60% |
| Avg Retrieval | > 0.7 | 0.5-0.7 | < 0.5 |
| Avg Groundedness | > 0.7 | 0.5-0.7 | < 0.5 |

### Common Failure Modes

1. **Missing documents**: Pattern not in KB
   - Action: Ingest relevant documents

2. **Low retrieval score**: Documents exist but not retrieved
   - Action: Check embeddings, reindex

3. **Wrong classification**: Document has wrong standard/jurisdiction
   - Action: Re-enrich document

---

## CI Integration

Add to `.github/workflows/ci.yml`:

```yaml
eval-kb:
  name: KB Evaluation
  runs-on: ubuntu-latest
  needs: [test]
  steps:
    - uses: actions/checkout@v4
    - run: pnpm install
    - run: pnpm eval:kb:smoke ${{ secrets.EVAL_ORG_ID }}
      env:
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

---

## Report Archive

Reports are auto-generated with timestamps:

```
evals/kb/
├── questions.json            # Golden questions
├── report-1704240000000.json # JSON results
└── report-1704240000000.md   # Markdown report
```

Retain last 10 reports in git, archive older to storage.
