export async function idempotent(client: any, waMessageId: string | null | undefined): Promise<boolean> {
  if (!waMessageId) return true;
  const { error } = await client.from('wa_events').insert({ wa_message_id: waMessageId });
  if ((error as { code?: string } | null | undefined)?.code === '23505') {
    return false;
  }
  if (error) {
    console.error('IDEMPOTENCY_ERROR', error);
    return false;
  }
  return true;
}
