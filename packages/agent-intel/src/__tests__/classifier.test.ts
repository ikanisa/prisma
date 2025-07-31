import { classifyIntent } from '../classifier';

Deno.test('classifier returns default unknown intent', async () => {
  const res = await classifyIntent('hello world');
  if (res.intent !== 'UNKNOWN') throw new Error('Expected UNKNOWN');
});
