
// Extended types for torch capability
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

export class CameraService {
  private static currentStream: MediaStream | null = null;

  static async startCamera(videoRef: React.RefObject<HTMLVideoElement>): Promise<boolean> {
    try {
      console.log('CameraService: Starting camera...');
      
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('CameraService: Camera stream obtained');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        this.currentStream = stream;
        
        return new Promise((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            console.log('CameraService: Video metadata loaded');
            videoRef.current!.play().then(() => {
              console.log('CameraService: Video playing');
              resolve(true);
            }).catch(error => {
              console.error('CameraService: Video play failed:', error);
              resolve(false);
            });
          };
          
          videoRef.current!.onerror = () => {
            console.error('CameraService: Video error');
            resolve(false);
          };
        });
      }
      
      return false;
    } catch (error) {
      console.error('CameraService: Camera access denied:', error);
      return false;
    }
  }

  static stopCamera(videoRef?: React.RefObject<HTMLVideoElement>) {
    console.log('CameraService: Stopping camera');
    
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => {
        track.stop();
        console.log('CameraService: Track stopped:', track.kind);
      });
      this.currentStream = null;
    }
    
    if (videoRef?.current) {
      videoRef.current.srcObject = null;
    }
  }

  static async toggleFlash(videoRef: React.RefObject<HTMLVideoElement>, flashEnabled: boolean): Promise<boolean> {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as ExtendedMediaTrackCapabilities;
        
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !flashEnabled } as ExtendedMediaTrackConstraintSet]
          });
          console.log('CameraService: Flash toggled to:', !flashEnabled);
          return !flashEnabled;
        }
      }
      return flashEnabled;
    } catch (error) {
      console.error('CameraService: Flash toggle failed:', error);
      return flashEnabled;
    }
  }

  static getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  static async checkCameraPermissions(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state === 'granted';
    } catch (error) {
      console.log('CameraService: Permission check not supported');
      return true; // Assume granted if can't check
    }
  }
}
