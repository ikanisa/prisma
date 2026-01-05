/**
 * OpenAI Apps SDK Metadata Utilities
 * 
 * Helper functions for generating and optimizing metadata for ChatGPT App Store
 */

import type { OpenAIMetadataConfig } from './config';

export interface OptimizedMetadata {
  title: string;
  description: string;
  keywords: string[];
  image: string;
  url: string;
  type: 'website' | 'app';
  siteName?: string;
  locale?: string;
}

/**
 * Optimize metadata for OpenAI Apps SDK submission
 * 
 * Ensures metadata follows OpenAI's guidelines:
 * - Title: 50 characters or less
 * - Description: 200 characters or less
 * - Keywords: 10 or fewer relevant tags
 */
export function optimizeMetadata(config: OpenAIMetadataConfig): OptimizedMetadata {
  const title = (config.title || 'Prisma Glow').slice(0, 50);
  const description = (config.description || '').slice(0, 200);
  const image = config.image?.url || '';
  const url = config.url || '';

  // Extract keywords from description and title
  const keywords = extractKeywords(title, description);

  return {
    title,
    description,
    keywords: keywords.slice(0, 10),
    image,
    url,
    type: 'app',
    siteName: title,
    locale: 'en-US',
  };
}

/**
 * Extract keywords from text
 */
function extractKeywords(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const words = text.split(/\s+/);
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  ]);

  const keywordMap = new Map<string, number>();
  for (const word of words) {
    const clean = word.replace(/[^a-z0-9]/g, '');
    if (clean.length > 3 && !commonWords.has(clean)) {
      keywordMap.set(clean, (keywordMap.get(clean) || 0) + 1);
    }
  }

  return Array.from(keywordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

/**
 * Generate Open Graph metadata
 */
export function generateOpenGraphMetadata(metadata: OptimizedMetadata) {
  return {
    'og:title': metadata.title,
    'og:description': metadata.description,
    'og:image': metadata.image,
    'og:url': metadata.url,
    'og:type': metadata.type,
    'og:site_name': metadata.siteName || metadata.title,
    'og:locale': metadata.locale || 'en_US',
  };
}

/**
 * Generate Twitter Card metadata
 */
export function generateTwitterCardMetadata(metadata: OptimizedMetadata) {
  return {
    'twitter:card': 'summary_large_image',
    'twitter:title': metadata.title,
    'twitter:description': metadata.description,
    'twitter:image': metadata.image,
    'twitter:url': metadata.url,
  };
}
