import { useConsent } from '@/hooks/use-consent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

export function CookieConsent() {
  const { consent, accept, reject, trackingEnabled } = useConsent();

  if (!trackingEnabled || consent) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6"
    >
      <Card className="max-w-3xl mx-auto shadow-lg border border-slate-200">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-slate-600 mt-0.5" aria-hidden />
            <p className="text-sm text-slate-700">
              We use cookies and similar technologies to enhance your experience and to collect analytics. You can accept or reject non-essential cookies. See our
              {' '}<a href="/privacy" className="underline text-slate-900 hover:text-slate-700">privacy notice</a>{' '}for more details.
            </p>
          </div>
          <div className="flex gap-2 md:ml-auto">
            <Button variant="outline" onClick={reject} aria-label="Reject non-essential cookies">
              Reject
            </Button>
            <Button onClick={accept} aria-label="Accept non-essential cookies">
              Accept
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
