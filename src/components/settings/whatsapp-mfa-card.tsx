import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Phone, CheckCircle, Timer, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { useWhatsappMfa } from '@/hooks/use-whatsapp-mfa';

export function WhatsappMfaCard() {
  const { currentRole } = useOrganizations();
  const { toast } = useToast();
  const { state, sendCode, verifyCode, cooldown, cooldownMessage, isSupabaseConfigured } = useWhatsappMfa();
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const isClient = currentRole === 'CLIENT';

  useEffect(() => {
    if (state.phone && !phone) {
      setPhone(state.phone);
    }
  }, [phone, state.phone]);

  const statusBadge = useMemo(() => {
    if (!state.verified) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-warning">
          <AlertCircle className="h-3 w-3" /> Not verified
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" /> Verified
      </Badge>
    );
  }, [state.verified]);

  const canSendOtp = Boolean(isSupabaseConfigured && phone.trim().length >= 5);
  const canVerify = Boolean(isSupabaseConfigured && code.trim().length >= 4);

  const handleSend = async () => {
    try {
      await sendCode(phone.trim());
      toast({ title: 'Verification code sent', description: 'Check WhatsApp for your 6-digit code.' });
    } catch (error: any) {
      toast({ title: 'Unable to send code', description: error.message, variant: 'destructive' });
    }
  };

  const handleVerify = async () => {
    try {
      await verifyCode(code.trim());
      toast({ title: 'WhatsApp verified', description: 'Sensitive actions are now protected for the next 24 hours.' });
      setCode('');
    } catch (error: any) {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" /> WhatsApp Verification
          </div>
          <p className="text-sm text-muted-foreground">
            Secure sensitive actions with a WhatsApp-delivered one-time code.
          </p>
        </div>
        {statusBadge}
      </div>

      {isClient ? (
        <p className="mt-4 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          Client users inherit verification from their engagement manager. Contact your administrator if you need additional access.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2" htmlFor="whatsapp-number">
              <Phone className="h-4 w-4" /> WhatsApp number (E.164)
            </label>
            <Input
              id="whatsapp-number"
              placeholder="+35612345678"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={state.loading}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSend}
              disabled={!canSendOtp || state.loading || Boolean(cooldown)}
            >
              {cooldownMessage ?? 'Send verification code'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Codes expire after 5 minutes. Three failed attempts will lock verification for 10 minutes.
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="whatsapp-code">
              Verification code
            </label>
            <div className="flex flex-wrap gap-3">
              <Input
                id="whatsapp-code"
                placeholder="000000"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="max-w-xs"
                disabled={state.loading}
              />
              <Button type="button" onClick={handleVerify} disabled={!canVerify || state.loading}>
                Verify code
              </Button>
            </div>
          </div>

          {state.lastVerifiedAt ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" /> Last verified {state.lastVerifiedAt.toLocaleString()}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
