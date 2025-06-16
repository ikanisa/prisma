
import { supabase } from '@/integrations/supabase/client';
import { errorMonitoringService } from './errorMonitoringService';
import { withRetry } from '@/utils/retryMechanism';

export interface QRProcessingResult {
  success: boolean;
  ussdCode?: string;
  confidence?: number;
  method: 'standard' | 'ai' | 'manual';
  processingTime: number;
}

class AIQRProcessingService {
  private processingQueue: Array<{ canvas: HTMLCanvasElement; resolve: Function; reject: Function }> = [];
  private isProcessing = false;

  async processQRWithAI(canvas: HTMLCanvasElement): Promise<QRProcessingResult> {
    const startTime = Date.now();
    
    try {
      return await withRetry(async () => {
        // Convert canvas to base64 image
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Call Supabase edge function for AI processing
        const { data, error } = await supabase.functions.invoke('scan-qr', {
          body: { 
            qrImage: imageData,
            enhanceImage: true,
            aiProcessing: true
          }
        });

        if (error) {
          errorMonitoringService.logSupabaseError('aiQRProcessing', error);
          throw error;
        }

        const processingTime = Date.now() - startTime;

        if (data?.ussdString) {
          return {
            success: true,
            ussdCode: data.ussdString,
            confidence: data.confidence || 0.9,
            method: 'ai',
            processingTime
          };
        }

        return {
          success: false,
          method: 'ai',
          processingTime
        };
      }, { maxAttempts: 2, delay: 1000 });

    } catch (error) {
      errorMonitoringService.logError(error as Error, 'ai_qr_processing');
      
      return {
        success: false,
        method: 'ai',
        processingTime: Date.now() - startTime
      };
    }
  }

  async enhanceImageForScanning(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply contrast enhancement
    const factor = 1.5;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));     // Red
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // Green
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // Blue
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  async queueProcessing(canvas: HTMLCanvasElement): Promise<QRProcessingResult> {
    return new Promise((resolve, reject) => {
      this.processingQueue.push({ canvas, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) return;

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const { canvas, resolve, reject } = this.processingQueue.shift()!;
      
      try {
        const result = await this.processQRWithAI(canvas);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Small delay between processing requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }
}

export const aiQRProcessingService = new AIQRProcessingService();
