import type { ReactNode } from 'react';

import { EmbeddingPlayground } from './components/playground';
import { SimilarityExplorer } from './components/similarity-explorer';

const useCases = [
  {
    title: 'Semantic search',
    description:
      'Rank documents, tickets, or knowledge base articles by their cosine similarity to the user\'s query embedding.',
  },
  {
    title: 'Clustering',
    description:
      'Group related documents or conversations for analysis, deduplication, or routing without labeled training data.',
  },
  {
    title: 'Recommendations',
    description:
      'Suggest similar content or products by comparing embedding distances to the item a user is currently viewing.',
  },
  {
    title: 'Anomaly detection',
    description:
      'Highlight outliers by finding vectors that are unusually far from the normal distribution of embeddings.',
  },
  {
    title: 'Diversity measurement',
    description:
      'Quantify how similar or dissimilar a corpus is by studying the distribution of pairwise embedding distances.',
  },
  {
    title: 'Classification',
    description:
      'Assign the label whose embedding is closest to the input when you need a fast, zero-shot categorisation pipeline.',
  },
] as const;

const models = [
  {
    name: 'text-embedding-3-small',
    pagesPerDollar: '62,500',
    mteb: '62.3%',
    maxInput: '8,192 tokens',
    notes: 'Best default choice—low cost, high multilingual performance, supports shortening via the dimensions parameter.',
  },
  {
    name: 'text-embedding-3-large',
    pagesPerDollar: '9,615',
    mteb: '64.6%',
    maxInput: '8,192 tokens',
    notes: 'Highest accuracy. Can be truncated down to 256+ dimensions while still outperforming text-embedding-ada-002.',
  },
  {
    name: 'text-embedding-ada-002',
    pagesPerDollar: '12,500',
    mteb: '61.0%',
    maxInput: '8,192 tokens',
    notes: 'Prior-generation baseline retained for backward compatibility and benchmarking comparisons.',
  },
] as const;

const jsEmbeddingExample = `import OpenAI from "openai";
const openai = new OpenAI();

const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "Your text string goes here",
  encoding_format: "float",
});

console.log(embedding);`;

const responseExcerpt = `{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [
        -0.006929283495992422,
        -0.005336422007530928,
        -0.00004547132266452536,
        -0.024047505110502243
      ]
    }
  ],
  "model": "text-embedding-3-small",
  "usage": {
    "prompt_tokens": 5,
    "total_tokens": 5
  }
}`;

const pythonDatasetSnippet = `from openai import OpenAI
client = OpenAI()

def get_embedding(text, model="text-embedding-3-small"):
    text = text.replace("\n", " ")
    return client.embeddings.create(input=[text], model=model).data[0].embedding

df['embedding'] = df.combined.apply(lambda x: get_embedding(x))
df.to_csv('output/embedded_1k_reviews.csv', index=False)`;

const numpyNormalizeSnippet = `import numpy as np
from openai import OpenAI

client = OpenAI()

def normalize_l2(x):
    x = np.array(x)
    if x.ndim == 1:
        norm = np.linalg.norm(x)
        if norm == 0:
            return x
        return x / norm
    norm = np.linalg.norm(x, 2, axis=1, keepdims=True)
    return np.where(norm == 0, x, x / norm)

response = client.embeddings.create(
    model="text-embedding-3-small",
    input="Testing 123",
    encoding_format="float",
)

cut_dim = response.data[0].embedding[:256]
norm_dim = normalize_l2(cut_dim)
print(norm_dim)`;

const searchSnippet = `from openai.embeddings_utils import get_embedding, cosine_similarity

def search_reviews(df, query, n=3):
    query_embedding = get_embedding(query, model='text-embedding-3-small')
    df['similarity'] = df.embedding.apply(lambda x: cosine_similarity(x, query_embedding))
    return df.sort_values('similarity', ascending=False).head(n)`;

const codeSearchSnippet = `df['code_embedding'] = df['code'].apply(
    lambda source: get_embedding(source, model='text-embedding-3-small')
)

def search_functions(df, code_query, n=3):
    query_embedding = get_embedding(code_query, model='text-embedding-3-small')
    df['similarity'] = df.code_embedding.apply(
        lambda emb: cosine_similarity(emb, query_embedding)
    )
    return df.sort_values('similarity', ascending=False).head(n)`;

const recommendationSnippet = `def recommendations_from_strings(strings, index_of_source_string, model="text-embedding-3-small"):
    embeddings = [embedding_from_string(s, model=model) for s in strings]
    query_embedding = embeddings[index_of_source_string]
    distances = distances_from_embeddings(query_embedding, embeddings, distance_metric="cosine")
    return indices_of_nearest_neighbors_from_distances(distances)`;

const faqItems = [
  {
    question: 'How can I count tokens before embedding text?',
    answer:
      'Use the tiktoken library. For third-generation models, choose the cl100k_base encoding and call encoding.encode(text) to inspect token counts.',
  },
  {
    question: 'Which distance metric should I use?',
    answer:
      'Cosine similarity is recommended. Because OpenAI embeddings are unit-normalised, cosine similarity and Euclidean distance produce identical rankings.',
  },
  {
    question: 'How do I store and query millions of embeddings efficiently?',
    answer:
      'Use a vector database or specialised index (for example, FAISS, pgvector, Pinecone, or Supabase Vector). They provide approximate nearest neighbour search for large corpora.',
  },
  {
    question: 'Can I try the embeddings API without wiring my own client?',
    answer:
      'Yes. Use the playground on this page to call the server-side proxy. It handles API keys via workloads defined in lib/openai/workloads.ts and returns the vector preview plus token usage.',
  },
] as const;

const outstandingItems = [
  'Escalate EMBEDDING_DELTA_FAILED alerts into PagerDuty so overnight refusals trigger the L2 on-call rotation.',
  'Persist manual delta run history (actor, lookback, tokens) and surface it alongside the telemetry dashboard for auditability.',
  'Fold deterministic corpus guidance into customer-facing onboarding docs so solution teams mirror QA workflows.',
] as const;

export const metadata = {
  title: 'Vector embeddings overview',
  description: 'Understand OpenAI embeddings, the new text-embedding-3 models, and practical workflows for search, clustering, and recommendations.'
};

type SectionProps = {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
};

function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        {description ? <p className="text-base text-slate-600">{description}</p> : null}
      </div>
      <div className="space-y-6 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-slate-950/95 p-4 text-xs text-slate-100 shadow-inner">
      <code>{code}</code>
    </pre>
  );
}

export default function EmbeddingsOverviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-10">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Embeddings</p>
        <h1 className="text-4xl font-bold text-slate-900">Vector embeddings for intelligent retrieval</h1>
        <p className="text-base text-slate-600">
          Embeddings convert natural language, source code, or other content into high-dimensional vectors. Comparing
          vectors lets you measure semantic relatedness, powering fast, accurate retrieval, recommendations, and
          analytics workflows.
        </p>
      </header>

      <Section id="models" title="New third-generation models" description="Pick a model that balances accuracy and cost for your workload.">
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">~ Pages / USD</th>
                <th className="px-4 py-3">MTEB score</th>
                <th className="px-4 py-3">Max input</th>
                <th className="px-4 py-3">Highlights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {models.map((model) => (
                <tr key={model.name} className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-900">{model.name}</td>
                  <td className="px-4 py-3 text-slate-600">{model.pagesPerDollar}</td>
                  <td className="px-4 py-3 text-slate-600">{model.mteb}</td>
                  <td className="px-4 py-3 text-slate-600">{model.maxInput}</td>
                  <td className="px-4 py-3 text-slate-600">{model.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Both models support the <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.8125rem] font-mono">dimensions</code> parameter. Shortening the vector lets you
          trade a small amount of accuracy for faster search and lower storage costs without retraining your application.
        </p>
      </Section>

      <Section id="capabilities" title="What can you build with embeddings?">
        <div className="grid gap-6 md:grid-cols-2">
          {useCases.map((useCase) => (
            <article key={useCase.title} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">{useCase.title}</h3>
              <p className="text-sm text-slate-600">{useCase.description}</p>
            </article>
          ))}
        </div>
        <p>
          The distance between two embedding vectors reflects semantic relatedness: small distances mean high affinity,
          large distances indicate dissimilar concepts. This property unlocks flexible ranking, grouping, and
          recommendation workflows.
        </p>
      </Section>

      <Section id="api" title="Create embeddings with the API">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">JavaScript</h3>
            <p className="text-sm text-slate-600">
              Call <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.8125rem] font-mono">openai.embeddings.create</code> with your preferred model. The response returns metadata and a vector you can
              persist in a database or search index.
            </p>
            <CodeBlock code={jsEmbeddingExample} />
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Response payload</h3>
            <p className="text-sm text-slate-600">
              Each response includes token usage plus the embedding array. Persist the vector as-is, or shorten it by
              passing <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.8125rem] font-mono">dimensions</code> when creating the embedding.
            </p>
            <CodeBlock code={responseExcerpt} />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Batching a dataset in Python</h3>
          <p className="text-sm text-slate-600">
            Combine review metadata into a single text field before embedding. Normalise whitespace to avoid
            accidental token inflation, then persist vectors for downstream analytics.
          </p>
          <CodeBlock code={pythonDatasetSnippet} />
        </div>
      </Section>

      <Section
        id="playground"
        title="Hands-on playground"
        description="Experiment with the embeddings proxy and semantic search ranking without leaving the page."
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <EmbeddingPlayground />
          <SimilarityExplorer />
        </div>
      </Section>

      <Section id="dimension-management" title="Managing embedding dimensions">
        <p>
          Large vectors provide excellent accuracy, but you can shrink them when storage or latency constraints demand
          it. With v3 models, prefer passing the <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.8125rem] font-mono">dimensions</code> parameter directly to the API. When you must post-process an
          existing vector, normalise it after truncation so cosine similarity remains meaningful.
        </p>
        <CodeBlock code={numpyNormalizeSnippet} />
        <p>
          This approach ensures compatibility with infrastructure that supports shorter vectors—such as vector databases
          capped at 1,024 dimensions—without sacrificing too much retrieval quality.
        </p>
      </Section>

      <Section id="retrieval" title="Search and retrieval patterns">
        <div className="space-y-6">
          <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Text search</h3>
            <p className="text-sm text-slate-600">
              Compute the embedding for a user query, then rank documents by cosine similarity. Keep the top matches and
              pass them into a language model as context for retrieval-augmented generation.
            </p>
            <CodeBlock code={searchSnippet} />
          </article>
          <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Code search</h3>
            <p className="text-sm text-slate-600">
              Embed function bodies or docstrings to power natural-language code discovery. Developers can search for
              “Completions API tests” and instantly surface the most relevant implementations.
            </p>
            <CodeBlock code={codeSearchSnippet} />
          </article>
          <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Personalised recommendations</h3>
            <p className="text-sm text-slate-600">
              Use embedding distances to identify near neighbours. Averaging vectors for users or products creates
              powerful cold-start features for recommendation systems.
            </p>
            <CodeBlock code={recommendationSnippet} />
          </article>
        </div>
      </Section>

      <Section id="analytics" title="Downstream analytics and modelling">
        <p>
          Embeddings double as dense feature encoders for machine learning. Feed them into clustering algorithms, t-SNE
          visualisations, or tree-based models for tasks such as sentiment regression and multi-class classification.
          Because the vectors are information-dense, reducing dimensionality via PCA often degrades task performance.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>
            <span className="font-medium text-slate-900">Regression:</span> predict a numerical score (for example, star
            ratings) with models such as RandomForestRegressor, achieving sub-half-star mean absolute error on review
            datasets.
          </li>
          <li>
            <span className="font-medium text-slate-900">Classification:</span> train classifiers on embeddings to
            categorise feedback. Extreme sentiments (1- and 5-star reviews) are often easiest to identify.
          </li>
          <li>
            <span className="font-medium text-slate-900">Zero-shot labelling:</span> embed label descriptions and compare
            them against review embeddings to choose the closest match without dedicated training data.
          </li>
          <li>
            <span className="font-medium text-slate-900">User & product profiling:</span> average embeddings per user or
            product to bootstrap cold-start recommendation quality before any live interaction occurs.
          </li>
        </ul>
      </Section>

      <Section id="faq" title="Frequently asked questions">
        <div className="space-y-6">
          {faqItems.map((item) => (
            <article key={item.question} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">{item.question}</h3>
              <p className="text-sm text-slate-600">{item.answer}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="outstanding"
        title="Outstanding rollout items"
        description="Track the remaining work to productionise the embeddings experience across environments."
      >
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          {outstandingItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
