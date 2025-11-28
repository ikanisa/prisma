import { Card, CardContent } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Privacy & Cookies</h1>
      <Card>
        <CardContent className="prose prose-slate dark:prose-invert p-6">
          <p>
            We use essential cookies to make our site work. With your consent, we also use non‑essential cookies to improve performance and collect analytics. You can accept or reject non‑essential cookies at any time.
          </p>
          <h2>How we use data</h2>
          <ul>
            <li>Operate the application and provide requested features.</li>
            <li>Measure usage for service quality and product improvement.</li>
            <li>Secure access and protect against fraud or abuse.</li>
          </ul>
          <p>
            For details on data handling and security practices, see the repository documentation and security guidelines.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

