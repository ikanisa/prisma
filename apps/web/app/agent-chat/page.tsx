"use client";
import { useEffect, useState } from 'react';

export default function AgentChat() {
  const [messages, setMessages] = useState<string[]>([]);
  useEffect(() => {
    const es = new EventSource(`${process.env.NEXT_PUBLIC_API_BASE}/agent/chat`);
    es.onmessage = (e) => setMessages((m) => [...m, e.data]);
    return () => es.close();
  }, []);
  return (
    <main className="p-4" aria-labelledby="chat-heading">
      <h1 id="chat-heading" className="text-xl mb-4">
        Agent Chat
      </h1>
      <div aria-live="polite" className="space-y-2">
        {messages.map((m, i) => (
          <p key={i}>{m}</p>
        ))}
      </div>
    </main>
  );
}
