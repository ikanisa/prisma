
interface TorchCapabilities {
  supportsTorch: boolean;
  torchEnabled: boolean;
}

interface LightingCondition {
  level: 'bright' | 'normal' | 'dim' | 'dark';
  shouldSuggestTorch: boolean;
}

export class EnhancedCameraService {
  private static currentStream: MediaStream | null = null;
  private static torchEnabled = false;

  static async checkTorchSupport(videoRef: React.RefObject<HTMLVideoElement>): Promise<boolean> {
    try {
      if (!videoRef.current?.srcObject) return false;
      
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      
      return 'torch' in capabilities && capabilities.torch === true;
    } catch (error) {
      console.log('Torch capability check failed:', error);
      return false;
    }
  }

  static async toggleTorch(videoRef: React.RefObject<HTMLVideoElement>): Promise<boolean> {
    try {
      if (!videoRef.current?.srcObject) return false;
      
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      
      if (!capabilities.torch) return false;

      const newTorchState = !this.torchEnabled;
      
      await track.applyConstraints({
        advanced: [{ torch: newTorchState } as any]
      });
      
      this.torchEnabled = newTorchState;
      return newTorchState;
    } catch (error) {
      console.error('Failed to toggle torch:', error);
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
          sensor.addEventListener('reading', () => {
            const lux = sensor.illuminance;
            
            if (lux > 1000) {
              resolve({ level: 'bright', shouldSuggestTorch: false });
            } else if (lux > 200) {
              resolve({ level: 'normal', shouldSuggestTorch: false });
            } else if (lux > 50) {
              resolve({ level: 'dim', shouldSuggestTorch: true });
            } else {
              resolve({ level: 'dark', shouldSuggestTorch: true });
            }
            
            sensor.stop();
          });
          
          sensor.start();
          
          // Fallback after 2 seconds
          setTimeout(() => {
            sensor.stop();
            resolve({ level: 'normal', shouldSuggestTorch: false });
          }, 2000);
        });
      } else {
        // Fallback: estimate based on time of day
        const hour = new Date().getHours();
        if (hour >= 6 && hour <= 18) {
          return { level: 'normal', shouldSuggestTorch: false };
        } else {
          return { level: 'dim', shouldSuggestTorch: true };
        }
      }
    } catch (error) {
      console.log('Lighting detection failed:', error);
      return { level: 'normal', shouldSuggestTorch: false };
    }
  }

  static async initializeCameraWithEnhancements(videoRef: React.RefObject<HTMLVideoElement>) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        this.currentStream = stream;
      }

      return stream;
    } catch (error) {
      console.error('Enhanced camera initialization failed:', error);
      throw error;
    }
  }

  static stopCamera() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    this.torchEnabled = false;
  }
}
