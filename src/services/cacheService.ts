
import { LRUCache } from 'lru-cache';
import { errorMonitoringService } from './errorMonitoringService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

class CacheService {
  private cache: LRUCache<string, any>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0
  };

  constructor() {
    this.cache = new LRUCache({
      max: 100, // Maximum number of items
      ttl: 1000 * 60 * 10, // 10 minutes default TTL
      updateAgeOnGet: true,
      allowStale: false
    });
  }

  set<T>(key: string, value: T, ttl?: number): void {
    try {
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: ttl || 10 * 60 * 1000 // 10 minutes default
      };

      this.cache.set(key, entry, { ttl });
      this.stats.sets++;
      this.stats.size = this.cache.size;
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'cache_set');
    }
  }

  get<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;
      
      if (entry) {
        // Check if entry is still valid
        const now = Date.now();
        if (now - entry.timestamp < entry.ttl) {
          this.stats.hits++;
          return entry.data;
        } else {
          this.delete(key);
          this.stats.misses++;
          return null;
        }
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'cache_get');
      this.stats.misses++;
      return null;
    }
  }

  delete(key: string): boolean {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.stats.deletes++;
        this.stats.size = this.cache.size;
      }
      return deleted;
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'cache_delete');
      return false;
    }
  }

  clear(): void {
    try {
      this.cache.clear();
      this.stats.size = 0;
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'cache_clear');
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // Specialized cache methods for QR scanning
  cacheQRResult(code: string, result: any): void {
    this.set(`qr_result_${code}`, result, 5 * 60 * 1000); // 5 minutes
  }

  getCachedQRResult(code: string): any | null {
    return this.get(`qr_result_${code}`);
  }

  cacheImageProcessing(imageHash: string, result: any): void {
    this.set(`image_${imageHash}`, result, 2 * 60 * 1000); // 2 minutes
  }

  getCachedImageProcessing(imageHash: string): any | null {
    return this.get(`image_${imageHash}`);
  }

  cacheUserSettings(settings: any): void {
    this.set('user_settings', settings, 24 * 60 * 60 * 1000); // 24 hours
  }

  getCachedUserSettings(): any | null {
    return this.get('user_settings');
  }
}

export const cacheService = new CacheService();
