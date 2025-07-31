import { decideResponse } from '../src/lib/decideResponse';

// Mock fetchButtons
jest.mock('../src/lib/fetchButtons', () => ({
  fetchButtons: jest.fn(() => Promise.resolve([
    { label: 'Pay', payload: 'PAY_QR' },
    { label: 'Ride', payload: 'PAX_REQUEST' },
    { label: 'Menu', payload: 'ORD_MENU' }
  ]))
}));

test('Welcome template only once inside 24h', async () => {
  const first = await decideResponse({
    waId: '123',
    domain: 'payments',
    intent: 'pay',
    confidence: 1,
    lastMsgAt: new Date(Date.now() - 26 * 60 * 60 * 1000) // 26 hours ago
  } as any);
  
  expect(first.type).toBe('template');

  const second = await decideResponse({
    waId: '123',
    domain: 'payments',
    intent: 'pay',
    confidence: 1,
    lastMsgAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
  } as any);
  
  expect(second.type).not.toBe('template');   // should be interactive
});

test('Low confidence triggers clarification', async () => {
  const plan = await decideResponse({
    waId: '123',
    domain: 'unknown',
    intent: '',
    confidence: 0.2,
    lastMsgAt: null
  } as any);
  
  expect(plan.type).toBe('clarify');
});

test('High confidence inside 24h uses interactive', async () => {
  const plan = await decideResponse({
    waId: '123',
    domain: 'ordering',
    intent: 'order',
    confidence: 0.8,
    lastMsgAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
  } as any);
  
  expect(plan.type).toBe('interactive');
});