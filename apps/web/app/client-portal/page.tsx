"use client";
import { useState } from 'react';
import { clientEnv } from '@/src/env.client';

const API_BASE = clientEnv.NEXT_PUBLIC_API_BASE ?? '';

export default function ClientPortal() {
  const [status, setStatus] = useState('');
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/client/upload`, {
      method: 'POST',
      body: form,
    });
    setStatus(res.ok ? 'Uploaded' : 'Upload failed');
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
