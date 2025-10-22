# Web Search Integration Guide

This guide explains how to enable and operate OpenAI's web search tooling when integrating it into agent or application workflows. It consolidates configuration, usage, and compliance practices relevant to the prisma-glow-15 platform.

## Overview

Web search augments model responses with up-to-date information retrieved from the public internet. Depending on the model configuration, the tooling ranges from lightweight lookups to multi-step research investigations. All configurations require explicit enablement in API requests.

## Web Search Modes

OpenAI exposes three operational modes that trade off latency and depth:

- **Non-reasoning web search** – forwards the user query directly to the search tool and relays the top-ranked results. This mode is ideal for quick lookups when latency is the primary concern.
- **Agentic search with reasoning models** – allows reasoning-capable models (for example GPT-5 with adjustable reasoning level) to iteratively issue searches, inspect results, and decide when to stop. Use this mode when tasks require follow-up questions or multi-step synthesis at the cost of additional latency.
- **Deep research** – orchestrates long-running, background searches that can review hundreds of sources. Suitable for extensive investigations (e.g., using `o3-deep-research`, `o4-mini-deep-research`, or high-reasoning GPT-5) and may take several minutes to complete.

## Enabling Web Search via the Responses API

Configure web search by declaring the tool in the `tools` array of a Responses API request. The model will invoke the tool when the prompt requires external information.

```ts
import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
  model: "gpt-5",
  tools: [{ type: "web_search" }],
  input: "What was a positive news story from today?",
});

console.log(response.output_text);
```

The same pattern applies to other models that support the tool. When using the Chat Completions API, select web-search-capable models such as `gpt-5-search-api`, `gpt-4o-search-preview`, or `gpt-4o-mini-search-preview`.

## Response Anatomy and Citations

Responses that invoke web search contain two high-level components:

1. A `web_search_call` object describing each tool invocation. The `action` field records steps like `search`, `open_page`, or `find_in_page`, and includes metadata such as queries, domains, and identifiers.
2. A `message` object that surfaces the synthesized text alongside inline citations. The `annotations` array attaches URL metadata (title, URL, location) for each citation so downstream consumers can render clickable references.

By default, inline citations appear in the generated text. When presenting results to end users, ensure the citations remain visible and clickable to satisfy attribution requirements.

## Domain Filtering

Restrict searches to an allow-list of domains with the `filters.allowed_domains` parameter (maximum of 20 entries). Specify hostnames without the protocol prefix, and note that subdomains are automatically included.

```json
{
  "model": "gpt-5",
  "tools": [
    {
      "type": "web_search",
      "filters": {
        "allowed_domains": [
          "pubmed.ncbi.nlm.nih.gov",
          "clinicaltrials.gov",
          "www.who.int",
          "www.cdc.gov",
          "www.fda.gov"
        ]
      }
    }
  ],
  "tool_choice": "auto",
  "include": ["web_search_call.action.sources"],
  "input": "Please perform a web search on how semaglutide is used in the treatment of diabetes."
}
```

The optional `sources` field returns the complete list of consulted URLs, which may exceed the subset cited in the generated message.

## Location Awareness

When geographic relevance matters, supply an approximate user location via `country`, `city`, `region`, and `timezone`. Locations must follow ISO/IANA conventions (`country` as two-letter ISO code, `timezone` as IANA identifier). Location controls are not currently supported for deep research models.

```ts
const response = await openai.responses.create({
  model: "o4-mini",
  tools: [
    {
      type: "web_search",
      user_location: {
        type: "approximate",
        country: "GB",
        city: "London",
        region: "London"
      }
    }
  ],
  input: "What are the best restaurants near me?",
});
```

## Limitations and Rate Considerations

- Web search is unavailable for `gpt-5` configured with minimal reasoning and for `gpt-4.1-nano`.
- Tool usage inherits the tiered rate limits of the underlying model and observes a maximum context window of 128,000 tokens.
- Each `search` action incurs the standard tool-call cost.

## Harvest Flow and Caching

When a web source is queued for ingestion, the RAG service performs the following steps:

1. Validate the URL against the configured allow-list and optionally `robots.txt` directives.
2. Fetch and normalise HTML content, falling back to cached copies in `web_fetch_cache` when the previous harvest is still fresh.
3. Summarise the content with the configured OpenAI model (preferring web search if enabled) and store embeddings in Postgres.
4. Emit `knowledge_events` and update the associated `learning_runs` row so dashboards and Supabase functions can reconcile status.

The `web_fetch_cache` table (created via the Supabase migrations) stores the canonical copy of fetched pages along with metadata such as fetch timestamps, summary length, and caller identity. Cache entries are refreshed automatically based on the `cacheTtlMinutes` policy and can be inspected through Supabase Studio for debugging. This keeps repeated harvests fast and reduces outbound bandwidth during continuous learning windows.

## Production Enablement Checklist

Follow the steps below when turning on web search in a new environment:

1. **Provision credentials:** request production access to OpenAI web search and store the key in the shared secrets manager alongside `OPENAI_API_KEY`.
2. **Flip the feature flag:** set `OPENAI_WEB_SEARCH_ENABLED=true` (already committed for production) and confirm the model identifier in `OPENAI_WEB_SEARCH_MODEL` if you are overriding the default `gpt-4.1-mini`.
3. **Apply required migrations:** run both `supabase/migrations/20251115122000_web_fetch_cache.sql` and `supabase/migrations/20251115123000_web_fetch_cache_retention.sql` against each Supabase project before deploying code. The quickest path is the helper script:
   ```bash
   SUPABASE_PROJECTS="preview=<ref>,production=<ref>" pnpm supabase:migrate:web-cache
   ```
   The script shells out to the Supabase CLI (`supabase db remote commit`) for each configured project, emitting the commands it executes. When the CLI is unavailable you can still apply the SQL manually via the Supabase SQL editor.
4. **Update environment manifests:** ensure `.env.production`, hosting environment variables, and Vault entries include the new keys `OPENAI_WEB_SEARCH_ENABLED`, `OPENAI_WEB_SEARCH_MODEL`, and `WEB_FETCH_CACHE_RETENTION_DAYS`.
5. **Smoke test the pipeline:** trigger a manual web harvest run and verify summaries include inline citations sourced from the web search tool.

## Monitoring and Retention

The cache now maintains explicit retention metadata and a metrics view for dashboards and runbooks:

- `WEB_FETCH_CACHE_RETENTION_DAYS` configures how long cached responses remain before the RAG service prunes them (default 14 days). Adjust the value per environment if storage or compliance requirements differ.
- The Supabase view `public.web_fetch_cache_metrics` exposes aggregate counters (`total_rows`, `total_bytes`, `fetched_last_24h`, etc.) that power the `/v1/knowledge/web-sources` API response. Use these metrics to validate freshness after deploys and to size retention policies. The `telemetry-sync` edge function also samples this view and emits a `WEB_CACHE_RETENTION` alert when the oldest fetch exceeds the configured window, making drift visible in Slack/PagerDuty destinations wired to telemetry alerts.
- When cache entries are reused the service records `last_used_at`, enabling alerts for stale or unused sources.

After deployment, monitor the metrics endpoint or view and confirm that `usedLast24h` keeps pace with ingestion expectations. Tune the retention window if storage growth exceeds targets or if compliance demands a shorter horizon.

## Compliance and Deployment Notes

- Display inline citations whenever web-sourced content reaches end users.
- Monitor usage metrics to stay within allocated rate limits, especially for deep research tasks that execute numerous search actions.
- Align deployment pipelines with hosting platform requirements, ensuring that any endpoints or web assets depending on web search integrations are included in QA before promotion to production.

## Additional Resources

- Review the model-specific documentation for detailed pricing and rate limits.
- Consult `docs/openai-client-architecture.md` to understand how web search fits into the broader client SDK integration strategy.
