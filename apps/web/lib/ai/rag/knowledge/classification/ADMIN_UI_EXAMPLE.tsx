/**
 * Example Admin UI Component for Web Source Auto-Classification
 * 
 * This demonstrates how to integrate the classification system into your admin panel.
 * Adapt this to your UI framework (React, Vue, Next.js, etc.)
 */

import { useState } from 'react';

// Types (should match backend)
interface WebSource {
  id: string;
  name: string;
  base_url: string;
  source_type: string;
  verification_level: 'primary' | 'secondary' | 'tertiary';
  source_priority: string;
  jurisdictions: string[];
  domains: string[];
  auto_classified: boolean;
  classification_confidence: number | null;
  classification_source: 'HEURISTIC' | 'LLM' | 'MIXED' | 'MANUAL' | null;
  is_active: boolean;
  created_at: string;
}

interface CreateWebSourceRequest {
  name: string;
  base_url: string;
  description?: string;
  page_title?: string;
  page_snippet?: string;
  force_manual?: boolean;
}

// API client functions
const api = {
  async createWebSource(data: CreateWebSourceRequest): Promise<WebSource> {
    const res = await fetch('/api/v1/web-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listWebSources(filters?: {
    page?: number;
    page_size?: number;
    auto_classified?: boolean;
  }): Promise<{ sources: WebSource[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.page_size) params.set('page_size', filters.page_size.toString());
    if (filters?.auto_classified !== undefined) {
      params.set('auto_classified', filters.auto_classified.toString());
    }
    
    const res = await fetch(`/api/v1/web-sources?${params}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async reclassifyWebSource(id: string, forceLLM = false): Promise<WebSource> {
    const res = await fetch(`/api/v1/web-sources/${id}/reclassify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_llm: forceLLM }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.source;
  },

  async updateWebSource(id: string, updates: Partial<WebSource>): Promise<WebSource> {
    const res = await fetch(`/api/v1/web-sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

// Component: Create Web Source Form
export function CreateWebSourceForm() {
  const [formData, setFormData] = useState<CreateWebSourceRequest>({
    name: '',
    base_url: '',
    description: '',
    page_title: '',
    page_snippet: '',
    force_manual: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WebSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const source = await api.createWebSource(formData);
      setResult(source);
      // Reset form
      setFormData({
        name: '',
        base_url: '',
        description: '',
        page_title: '',
        page_snippet: '',
        force_manual: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create source');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-form">
      <h2>Add Web Knowledge Source</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Rwanda Revenue Authority"
          />
        </div>

        <div className="form-group">
          <label htmlFor="base_url">URL *</label>
          <input
            id="base_url"
            type="url"
            required
            value={formData.base_url}
            onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
            placeholder="https://www.rra.gov.rw"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
          />
        </div>

        <details>
          <summary>Advanced Options (Optional)</summary>
          
          <div className="form-group">
            <label htmlFor="page_title">Page Title</label>
            <input
              id="page_title"
              type="text"
              value={formData.page_title}
              onChange={(e) => setFormData({ ...formData, page_title: e.target.value })}
              placeholder="Helps LLM classification"
            />
          </div>

          <div className="form-group">
            <label htmlFor="page_snippet">Page Snippet</label>
            <textarea
              id="page_snippet"
              value={formData.page_snippet}
              onChange={(e) => setFormData({ ...formData, page_snippet: e.target.value })}
              placeholder="First paragraph or description"
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.force_manual}
                onChange={(e) => setFormData({ ...formData, force_manual: e.target.checked })}
              />
              Skip auto-classification (manual entry)
            </label>
          </div>
        </details>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Source'}
        </button>
      </form>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="alert alert-success">
          <h3>✅ Source Created Successfully</h3>
          <ClassificationResult source={result} />
        </div>
      )}
    </div>
  );
}

// Component: Classification Result Display
function ClassificationResult({ source }: { source: WebSource }) {
  const confidenceColor = (confidence: number | null) => {
    if (!confidence) return 'gray';
    if (confidence >= 80) return 'green';
    if (confidence >= 50) return 'orange';
    return 'red';
  };

  return (
    <div className="classification-result">
      <div className="result-row">
        <strong>Category:</strong> {source.source_type || 'N/A'}
      </div>
      <div className="result-row">
        <strong>Verification Level:</strong> {source.verification_level || 'N/A'}
      </div>
      <div className="result-row">
        <strong>Jurisdictions:</strong> {source.jurisdictions.join(', ') || 'None'}
      </div>
      <div className="result-row">
        <strong>Domains:</strong> {source.domains.join(', ') || 'None'}
      </div>
      <div className="result-row">
        <strong>Auto-Classified:</strong>{' '}
        {source.auto_classified ? (
          <span className="badge badge-success">Yes</span>
        ) : (
          <span className="badge badge-secondary">Manual</span>
        )}
      </div>
      <div className="result-row">
        <strong>Confidence:</strong>{' '}
        {source.classification_confidence ? (
          <span
            className="confidence-score"
            style={{ color: confidenceColor(source.classification_confidence) }}
          >
            {source.classification_confidence}%
          </span>
        ) : (
          'N/A'
        )}
      </div>
      <div className="result-row">
        <strong>Source:</strong>{' '}
        <span className="badge">{source.classification_source || 'MANUAL'}</span>
      </div>
    </div>
  );
}

// Component: Web Sources List
export function WebSourcesList() {
  const [sources, setSources] = useState<WebSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'auto' | 'manual'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadSources = async () => {
    setLoading(true);
    try {
      const result = await api.listWebSources({
        page,
        page_size: 20,
        auto_classified: filter === 'auto' ? true : filter === 'manual' ? false : undefined,
      });
      setSources(result.sources);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSources();
  }, [page, filter]);

  const handleReclassify = async (id: string) => {
    try {
      const updated = await api.reclassifyWebSource(id, true);
      setSources((prev) =>
        prev.map((s) => (s.id === id ? updated : s))
      );
      alert('Reclassified successfully!');
    } catch (err) {
      alert('Reclassification failed: ' + (err instanceof Error ? err.message : ''));
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="sources-list">
      <div className="list-header">
        <h2>Web Knowledge Sources ({total})</h2>
        
        <div className="filters">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'auto' ? 'active' : ''}
            onClick={() => setFilter('auto')}
          >
            Auto-Classified
          </button>
          <button
            className={filter === 'manual' ? 'active' : ''}
            onClick={() => setFilter('manual')}
          >
            Manual
          </button>
        </div>
      </div>

      <table className="sources-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>URL</th>
            <th>Type</th>
            <th>Jurisdiction</th>
            <th>Auto</th>
            <th>Confidence</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id}>
              <td>{source.name}</td>
              <td>
                <a href={source.base_url} target="_blank" rel="noopener noreferrer">
                  {new URL(source.base_url).hostname}
                </a>
              </td>
              <td>{source.source_type || '—'}</td>
              <td>{source.jurisdictions.join(', ') || '—'}</td>
              <td>
                {source.auto_classified ? (
                  <span className="badge badge-success">✓</span>
                ) : (
                  <span className="badge badge-secondary">Manual</span>
                )}
              </td>
              <td>
                {source.classification_confidence ? (
                  <span
                    style={{
                      color:
                        source.classification_confidence >= 80
                          ? 'green'
                          : source.classification_confidence >= 50
                          ? 'orange'
                          : 'red',
                    }}
                  >
                    {source.classification_confidence}%
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td>
                <button onClick={() => handleReclassify(source.id)}>
                  Reclassify
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={page * 20 >= total}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Styles (convert to your CSS framework)
const styles = `
.create-form {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.alert {
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.alert-success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.alert-error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.badge-success {
  background-color: #28a745;
  color: white;
}

.badge-secondary {
  background-color: #6c757d;
  color: white;
}

.sources-table {
  width: 100%;
  border-collapse: collapse;
}

.sources-table th,
.sources-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.sources-table th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.confidence-score {
  font-weight: 600;
}
`;
