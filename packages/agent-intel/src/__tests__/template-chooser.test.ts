import { chooseTemplate } from '../template-chooser';
import { assertEquals } from 'https://deno.land/std@0.224.0/testing/asserts.ts';

Deno.test('chooseTemplate returns null for fallback case', () => {
  const tpl = chooseTemplate('HELP', 'general', undefined);
  assertEquals(tpl, null);
});
