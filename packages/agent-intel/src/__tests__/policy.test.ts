import { shouldAskClarify } from '../policy';
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/testing/asserts.ts';

Deno.test('should ask clarify when confidence low and not yet asked', () => {
  assert(shouldAskClarify(0.5, 0));
});

Deno.test('should not ask clarify when already asked once', () => {
  assertEquals(shouldAskClarify(0.4, 1), false);
});
