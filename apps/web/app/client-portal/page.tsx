"use client";
import { useState } from 'react';
import { clientEnv } from '@/src/env.client';
import { submitDocument } from './upload-service';

const API_BASE = clientEnv.NEXT_PUBLIC_API_BASE ?? '';

export default function ClientPortal() {
  const [status, setStatus] = useState('');
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await submitDocument({ apiBase: API_BASE, fetchImpl: fetch }, file);
    setStatus(ok ? 'Uploaded' : 'Upload failed');
  };
  return (
    <main className="p-4" aria-labelledby="client-portal-heading">
      <h1 id="client-portal-heading" className="text-xl mb-4">
        Client Portal
      </h1>
      <input aria-label="Upload document" type="file" onChange={upload} />
      <p className="mt-2" aria-live="polite">{status}</p>
    </main>
  );
}
