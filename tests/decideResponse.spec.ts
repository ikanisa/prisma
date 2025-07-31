import { decideResponse } from '@/lib/decideResponse';

// Mock fetchButtons
jest.mock('@/lib/fetchButtons', () => ({
  fetchButtons: jest.fn(() => Promise.resolve([
    { label: 'Pay', payload: 'PAY_QR' },
    { label: 'Ride', payload: 'PAX_REQUEST' },
    { label: 'Menu', payload: 'ORD_MENU' }
  ]))
}));

test('outside 24h uses template', async () => {
  const plan = await decideResponse({
    waId: '123',
    domain: 'payments',
    intent: 'pay',
    confidence: 0.9,
    lastMsgAt: new Date(Date.now() - 26 * 60 * 60 * 1000) // 26 hours ago
  } as any);
  
  expect(plan.type).toBe('template');
});

test('inside 24h uses interactive', async () => {
  const plan = await decideResponse({
    waId: '123',
    domain: 'payments',
    intent: 'pay',
    confidence: 0.9,
    lastMsgAt: new Date(Date.now() - 60 * 1000) // 1 minute ago
  } as any);
  
  expect(plan.type).toBe('interactive');
});

test('low confidence asks clarify', async () => {
  const plan = await decideResponse({
    waId: '123',
    domain: 'unknown',
    intent: '',
    confidence: 0.2,
    lastMsgAt: null
  } as any);
  
  expect(plan.type).toBe('clarify');
});