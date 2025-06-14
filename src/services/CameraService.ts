
// Extended types for torch capability
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

export class CameraService {
  static async startCamera(videoRef: React.RefObject<HTMLVideoElement>): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Camera access denied:', error);
      return false;
    }
  }

  static stopCamera(videoRef: React.RefObject<HTMLVideoElement>) {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
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
          return !flashEnabled;
        }
      }
      return flashEnabled;
    } catch (error) {
      console.error('Flash toggle failed:', error);
      return flashEnabled;
    }
  }
}
