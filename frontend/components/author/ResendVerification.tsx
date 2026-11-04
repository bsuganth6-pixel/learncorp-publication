'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { resendVerification, ApiClientError } from '@/lib/api-client';
import Alert from '@/components/ui/Alert';

/** "Send me a new confirmation link", with the outcome shown in place. */
export default function ResendVerification({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const send = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await resendVerification();
      setResult({ tone: 'success', message: res.message });
    } catch (err) {
      setResult({ tone: 'error', message: err instanceof ApiClientError ? err.message : 'We couldn’t send the email. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={send} disabled={busy} className={compact ? 'btn-outline px-4 py-2 text-sm' : 'btn-primary w-full'}>
        {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        Send a new confirmation link
      </button>
      {result && <Alert tone={result.tone}>{result.message}</Alert>}
    </div>
  );
}
