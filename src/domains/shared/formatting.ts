// Shared formatting utilities extracted from lib/utils.ts

// Currency formatting for Rwanda and other supported currencies
export function formatCurrency(amount: number, currency: string = 'RWF'): string {
  const formatters = {
    RWF: (amt: number) => `${amt.toLocaleString()} RWF`,
    USD: (amt: number) => `$${amt.toFixed(2)}`,
    EUR: (amt: number) => `€${amt.toFixed(2)}`
  };
  
  const formatter = formatters[currency as keyof typeof formatters];
  return formatter ? formatter(amount) : `${amount} ${currency}`;
}

// Date formatting utilities
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-RW');
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-RW');
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(date);
}

// Phone number formatting for Rwanda
export function formatPhoneNumber(phone: string): string {
  if (phone.startsWith('+250')) {
    return phone.replace('+250', '(+250) ').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  return phone;
}

// Text utilities
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

// File utilities
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

// Status utilities
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    active: 'text-green-600 bg-green-100',
    pending: 'text-yellow-600 bg-yellow-100',
    completed: 'text-blue-600 bg-blue-100',
    failed: 'text-red-600 bg-red-100',
    cancelled: 'text-gray-600 bg-gray-100',
    success: 'text-green-600 bg-green-100',
    error: 'text-red-600 bg-red-100',
    warning: 'text-yellow-600 bg-yellow-100',
    info: 'text-blue-600 bg-blue-100',
  };
  
  return statusColors[status.toLowerCase()] || 'text-gray-600 bg-gray-100';
}

// Quality score utilities for AI/ML features
export function getQualityScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
}

export function getQualityScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Poor';
  return 'Critical';
}