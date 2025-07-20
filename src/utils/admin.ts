// Admin utility functions for common operations

import type { AdminError } from '@/types/admin';

/**
 * Format currency values consistently across the admin panel
 */
export function formatCurrency(amount: number, currency = 'RWF'): string {
  return `${amount.toLocaleString()} ${currency}`;
}

/**
 * Format phone numbers consistently
 */
export function formatPhone(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Rwanda phone numbers (+250)
  if (cleaned.startsWith('250')) {
    return `+${cleaned}`;
  }
  
  if (cleaned.startsWith('07') || cleaned.startsWith('78') || cleaned.startsWith('79')) {
    return `+250${cleaned}`;
  }
  
  return phone;
}

/**
 * Generate user initials from phone number or name
 */
export function getUserInitials(identifier: string): string {
  if (!identifier) return 'U';
  
  // If it looks like a phone number, use last 2 digits
  if (/^\+?\d+$/.test(identifier.replace(/\s/g, ''))) {
    return identifier.slice(-2).toUpperCase();
  }
  
  // If it's a name, use first letters of words
  return identifier
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get relative time from date string
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diffInMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get badge variant for different statuses
 */
export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    approved: 'default',
    paid: 'default',
    completed: 'default',
    fulfilled: 'default',
    healthy: 'default',
    
    pending: 'secondary',
    processing: 'secondary',
    trial: 'secondary',
    
    failed: 'destructive',
    cancelled: 'destructive',
    suspended: 'destructive',
    error: 'destructive',
    down: 'destructive',
    
    draft: 'outline',
    inactive: 'outline',
    degraded: 'outline'
  };
  
  return statusMap[status.toLowerCase()] || 'outline';
}

/**
 * Get credit badge variant based on amount
 */
export function getCreditBadgeVariant(credits: number): 'default' | 'secondary' | 'destructive' {
  if (credits >= 50) return 'default';
  if (credits >= 10) return 'secondary';
  return 'destructive';
}

/**
 * Validate admin data before sending to API
 */
export function validateAdminData<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): { isValid: boolean; errors: AdminError[] } {
  const errors: AdminError[] = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: `${String(field)} is required`,
        details: { field }
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (data.length === 0) return;
  
  const headers = columns 
    ? columns.map(col => col.label)
    : Object.keys(data[0]);
    
  const csvContent = [
    headers.join(','),
    ...data.map(row => {
      const values = columns
        ? columns.map(col => row[col.key])
        : Object.values(row);
        
      return values.map(value => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape commas and quotes
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    })
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Open WhatsApp chat with phone number
 */
export function openWhatsApp(phone: string, message?: string): void {
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('250') ? cleanPhone : `250${cleanPhone}`;
  const encodedMessage = message ? encodeURIComponent(message) : 'Hello%20from%20easyMO%20Admin';
  window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate pagination info
 */
export function getPaginationInfo(
  currentPage: number,
  totalItems: number,
  itemsPerPage: number
) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return {
    totalPages,
    startItem,
    endItem,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages
  };
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate random ID for temporary use
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}