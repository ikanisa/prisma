import { describe, it, expect } from 'vitest';

// Mock utility functions for testing
const formatCurrency = (amount: number): string => {
  return `RWF ${amount.toLocaleString()}`;
};

const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString();
};

const formatPhoneNumber = (phone: string): string => {
  // Format Rwanda phone numbers
  if (phone.startsWith('+250')) {
    return phone.replace('+250', '(+250) ').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  return phone;
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone: string): boolean => {
  // Rwanda phone number validation
  const phoneRegex = /^\+250[0-9]{9}$/;
  return phoneRegex.test(phone);
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

const sortByDate = <T extends { created_at: string }>(
  items: T[],
  ascending: boolean = false
): T[] => {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

describe('formatCurrency', () => {
  it('formats positive amounts correctly', () => {
    expect(formatCurrency(1000)).toBe('RWF 1,000');
    expect(formatCurrency(50000)).toBe('RWF 50,000');
    expect(formatCurrency(1234567)).toBe('RWF 1,234,567');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('RWF 0');
  });

  it('formats decimal amounts correctly', () => {
    expect(formatCurrency(1000.50)).toBe('RWF 1,001');
  });
});

describe('formatDate', () => {
  it('formats date strings correctly', () => {
    const date = '2024-01-15T10:30:00Z';
    const formatted = formatDate(date);
    expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('formats Date objects correctly', () => {
    const date = new Date('2024-01-15');
    const formatted = formatDate(date);
    expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});

describe('formatPhoneNumber', () => {
  it('formats Rwanda phone numbers correctly', () => {
    expect(formatPhoneNumber('+250788123456')).toBe('(+250) 788 123 456');
    expect(formatPhoneNumber('+250722987654')).toBe('(+250) 722 987 654');
  });

  it('returns unformatted number for other countries', () => {
    expect(formatPhoneNumber('+1234567890')).toBe('+1234567890');
    expect(formatPhoneNumber('0788123456')).toBe('0788123456');
  });
});

describe('validateEmail', () => {
  it('validates correct email formats', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
    expect(validateEmail('user.name@company.org')).toBe(true);
  });

  it('rejects invalid email formats', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('user..double.dot@example.com')).toBe(false);
  });
});

describe('validatePhoneNumber', () => {
  it('validates Rwanda phone numbers', () => {
    expect(validatePhoneNumber('+250788123456')).toBe(true);
    expect(validatePhoneNumber('+250722987654')).toBe(true);
    expect(validatePhoneNumber('+250733456789')).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(validatePhoneNumber('0788123456')).toBe(false);
    expect(validatePhoneNumber('+250788')).toBe(false);
    expect(validatePhoneNumber('+2507881234567')).toBe(false);
    expect(validatePhoneNumber('+1234567890')).toBe(false);
  });
});

describe('truncateText', () => {
  it('truncates text longer than max length', () => {
    const longText = 'This is a very long text that needs to be truncated';
    expect(truncateText(longText, 20)).toBe('This is a very long ...');
  });

  it('returns original text if shorter than max length', () => {
    const shortText = 'Short text';
    expect(truncateText(shortText, 20)).toBe('Short text');
  });

  it('returns original text if exactly max length', () => {
    const exactText = 'Exactly twenty chars';
    expect(truncateText(exactText, 20)).toBe('Exactly twenty chars');
  });
});

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
    expect(id2.length).toBeGreaterThan(0);
  });

  it('generates alphanumeric IDs', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});

describe('debounce', () => {
  it('delays function execution', async () => {
    let called = false;
    const fn = debounce(() => { called = true; }, 100);
    
    fn();
    expect(called).toBe(false);
    
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(called).toBe(true);
  });

  it('cancels previous calls', async () => {
    let callCount = 0;
    const fn = debounce(() => { callCount++; }, 100);
    
    fn();
    fn();
    fn();
    
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(callCount).toBe(1);
  });
});

describe('calculatePercentage', () => {
  it('calculates percentages correctly', () => {
    expect(calculatePercentage(25, 100)).toBe(25);
    expect(calculatePercentage(50, 200)).toBe(25);
    expect(calculatePercentage(33, 100)).toBe(33);
  });

  it('handles edge cases', () => {
    expect(calculatePercentage(0, 100)).toBe(0);
    expect(calculatePercentage(100, 0)).toBe(0);
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calculatePercentage(33, 100)).toBe(33);
    expect(calculatePercentage(67, 100)).toBe(67);
    expect(calculatePercentage(1, 3)).toBe(33); // 33.33... rounded to 33
  });
});

describe('sortByDate', () => {
  const testItems = [
    { id: '1', created_at: '2024-01-15T10:00:00Z', name: 'First' },
    { id: '2', created_at: '2024-01-16T10:00:00Z', name: 'Second' },
    { id: '3', created_at: '2024-01-14T10:00:00Z', name: 'Third' }
  ];

  it('sorts in descending order by default', () => {
    const sorted = sortByDate(testItems);
    expect(sorted[0].id).toBe('2'); // Most recent
    expect(sorted[1].id).toBe('1');
    expect(sorted[2].id).toBe('3'); // Oldest
  });

  it('sorts in ascending order when specified', () => {
    const sorted = sortByDate(testItems, true);
    expect(sorted[0].id).toBe('3'); // Oldest
    expect(sorted[1].id).toBe('1');
    expect(sorted[2].id).toBe('2'); // Most recent
  });

  it('does not mutate original array', () => {
    const originalOrder = testItems.map(item => item.id);
    sortByDate(testItems);
    const afterSort = testItems.map(item => item.id);
    expect(afterSort).toEqual(originalOrder);
  });
});