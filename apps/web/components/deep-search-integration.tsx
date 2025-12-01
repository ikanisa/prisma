/**
 * DeepSearch Integration Example
 * 
 * This component demonstrates how to use the knowledge_web_sources table
 * to dynamically build a domain whitelist for web searches.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getActiveDomains, getPrimarySources, getSourcesByCategory } from '@/packages/lib/src/knowledge-web-sources';
import { Search, Globe, Check } from 'lucide-react';

export function DeepSearchIntegration() {
  const supabase = createClientComponentClient();
  
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // Load domains on mount
  useEffect(() => {
    loadDomains();
  }, []);

  async function loadDomains() {
    try {
      // Get all active domains for whitelisting
      const activeDomains = await getActiveDomains(supabase);
      setDomains(activeDomains);
      
      console.log(`Loaded ${activeDomains.length} active domains for search`);
    } catch (error) {
      console.error('Failed to load domains:', error);
    }
  }

  async function handleSearch() {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      // Example: Search only primary IFRS sources
      const ifrsSources = await getPrimarySources(supabase, { category: 'IFRS' });
      const ifrsDomains = ifrsSources.map(s => s.domain);
      
      // Here you would call your actual search API with the domain whitelist
      console.log('Searching across domains:', ifrsDomains);
      
      // Mock search results
      setResults([
        {
          title: 'IFRS 15 - Revenue from Contracts',
          url: 'https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/',
          snippet: 'IFRS 15 specifies how and when an IFRS reporter will recognise revenue...',
          domain: 'ifrs.org'
        },
        {
          title: 'KPMG - IFRS 15 Insights',
          url: 'https://kpmg.com/xx/en/home/services/audit/ifrs-in-focus.html',
          snippet: 'Practical guidance on implementing IFRS 15 revenue recognition...',
          domain: 'kpmg.com'
        }
      ]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Deep Search with Domain Whitelist
        </h3>
        
        <div className="space-y-4">
          {/* Domain Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>
              Searching across {domains.length} trusted domains
            </span>
          </div>

          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search IFRS standards, tax regulations..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-lg border border-input bg-background px-10 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3 mt-6">
              <h4 className="text-sm font-medium text-foreground">
                Results from trusted sources:
              </h4>
              {results.map((result, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {result.title}
                      </a>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.snippet}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Check className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-muted-foreground">
                          {result.domain}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Code Example */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Integration Example
        </h3>
        
        <pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto">
          <code>{`import { getActiveDomains, getPrimarySources } from '@/packages/lib/src/knowledge-web-sources';

// Get all active domains
const domains = await getActiveDomains(supabase);

// Get primary IFRS sources only
const ifrsSources = await getPrimarySources(supabase, { 
  category: 'IFRS' 
});

// Get Rwanda tax sources
const rwTax = await getActiveSources(supabase, {
  category: 'TAX',
  jurisdiction: 'RW'
});

// Use domains in your search API
const results = await searchWeb(query, { 
  allowedDomains: domains 
});`}</code>
        </pre>
      </div>
    </div>
  );
}
