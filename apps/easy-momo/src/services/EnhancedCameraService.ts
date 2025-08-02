
import { CameraService } from './CameraService';

interface TorchCapabilities {
  supportsTorch: boolean;
  torchEnabled: boolean;
}

interface LightingCondition {
  level: 'bright' | 'normal' | 'dim' | 'dark';
  shouldSuggestTorch: boolean;
}

export class EnhancedCameraService {
  private static torchEnabled = false;
  private static initialized = false;

  static async checkTorchSupport(videoRef: React.RefObject<HTMLVideoElement>): Promise<boolean> {
    try {
      if (!videoRef.current?.srcObject) {
        console.log('EnhancedCameraService: No video stream for torch check');
        return false;
      }
      
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      
      if (!track) {
        console.log('EnhancedCameraService: No video track found');
        return false;
      }
      
      const capabilities = track.getCapabilities() as any;
      const hasTorch = 'torch' in capabilities && capabilities.torch === true;
      
      console.log('EnhancedCameraService: Torch support:', hasTorch);
      return hasTorch;
    } catch (error) {
      console.log('EnhancedCameraService: Torch capability check failed:', error);
      return false;
    }
  }

  static async toggleTorch(videoRef: React.RefObject<HTMLVideoElement>): Promise<boolean> {
    try {
      const newState = await CameraService.toggleFlash(videoRef, this.torchEnabled);
      this.torchEnabled = newState;
      console.log('EnhancedCameraService: Torch state changed to:', newState);
      return newState;
    } catch (error) {
      console.error('EnhancedCameraService: Failed to toggle torch:', error);
      return this.torchEnabled;
    }
  }

  static getTorchState(): boolean {
    return this.torchEnabled;
  }

  static async detectLightingCondition(): Promise<LightingCondition> {
    try {
      // Try to use ambient light sensor if available
      if ('AmbientLightSensor' in window) {
        const sensor = new (window as any).AmbientLightSensor();
        
        return new Promise((resolve) => {
          const timeout = window.setTimeout(() => {
            try {
              sensor.stop();
            } catch (e) {
              // Sensor might already be stopped
            }
            resolve(this.getFallbackLightingCondition());
          }, 2000);
          
          sensor.addEventListener('reading', () => {
            try {
              const lux = sensor.illuminance;
              window.clearTimeout(timeout);
              sensor.stop();
              
              if (lux > 1000) {
                resolve({ level: 'bright', shouldSuggestTorch: false });
              } else if (lux > 200) {
                resolve({ level: 'normal', shouldSuggestTorch: false });
              } else if (lux > 50) {
                resolve({ level: 'dim', shouldSuggestTorch: true });
              } else {
                resolve({ level: 'dark', shouldSuggestTorch: true });
              }
            } catch (error) {
              window.clearTimeout(timeout);
              resolve(this.getFallbackLightingCondition());
            }
          });
          
          sensor.addEventListener('error', () => {
            window.clearTimeout(timeout);
            resolve(this.getFallbackLightingCondition());
          });
          
          try {
            sensor.start();
          } catch (error) {
            window.clearTimeout(timeout);
            resolve(this.getFallbackLightingCondition());
          }
        });
      } else {
        return this.getFallbackLightingCondition();
      }
    } catch (error) {
      console.log('EnhancedCameraService: Lighting detection failed:', error);
      return this.getFallbackLightingCondition();
    }
  }

  private static getFallbackLightingCondition(): LightingCondition {
    // Fallback: estimate based on time of day
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 18) {
      return { level: 'normal', shouldSuggestTorch: false };
    } else {
      return { level: 'dim', shouldSuggestTorch: true };
    }
  }

  static async initializeCameraWithEnhancements(videoRef: React.RefObject<HTMLVideoElement>): Promise<MediaStream | null> {
    // Don't initialize if already done
    if (this.initialized) {
      console.log('EnhancedCameraService: Already initialized, skipping');
      return CameraService.getCurrentStream();
    }

    try {
      console.log('EnhancedCameraService: Initializing enhanced camera...');
      
      // Wait a bit for the main scanner to initialize first
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const stream = CameraService.getCurrentStream();
      if (stream && videoRef.current) {
        console.log('EnhancedCameraService: Using existing camera stream');
        this.initialized = true;
        return stream;
      }
      
      console.log('EnhancedCameraService: Enhanced camera initialization skipped - using main scanner stream');
      return null;
    } catch (error) {
      console.error('EnhancedCameraService: Enhanced camera initialization failed:', error);
      throw error;
    }
  }

  static stopCamera() {
    console.log('EnhancedCameraService: Stopping camera');
    this.torchEnabled = false;
    this.initialized = false;
  }

  static async waitForVideoReady(videoRef: React.RefObject<HTMLVideoElement>, timeout = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      if (!videoRef.current) {
        resolve(false);
        return;
      }

      const video = videoRef.current;
      
      // Check if already ready
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        resolve(true);
        return;
      }

      let timeoutId: ReturnType<typeof setTimeout>;
      let resolved = false;
      
      const onReady = () => {
        if (resolved) return;
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          resolved = true;
          clearTimeout(timeoutId);
          video.removeEventListener('loadedmetadata', onReady);
          video.removeEventListener('canplay', onReady);
          resolve(true);
        }
      };

      video.addEventListener('loadedmetadata', onReady, { once: true });
      video.addEventListener('canplay', onReady, { once: true });
      
      timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        video.removeEventListener('loadedmetadata', onReady);
        video.removeEventListener('canplay', onReady);
        resolve(false);
      }, timeout);
    });
  }
}
