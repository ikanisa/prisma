import { formatResponse } from '../formatter';
import { assertEquals } from 'https://deno.land/std@0.224.0/testing/asserts.ts';

Deno.test('formatResponse returns payload unchanged', () => {
  const payload = { type: 'text_buttons', text: 'hi', buttons: [] } as const;
  assertEquals(formatResponse(payload), payload);
});
