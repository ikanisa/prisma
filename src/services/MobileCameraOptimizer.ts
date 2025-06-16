
import { toastService } from './toastService';

export interface MobileOptimizationSettings {
  preferredCamera: 'front' | 'back';
  resolution: 'low' | 'medium' | 'high';
  frameRate: number;
  enableTorch: boolean;
  autoFocus: boolean;
}

export class MobileCameraOptimizer {
  private static instance: MobileCameraOptimizer;
  private currentSettings: MobileOptimizationSettings;

  constructor() {
    this.currentSettings = {
      preferredCamera: 'back',
      resolution: 'medium',
      frameRate: 30,
      enableTorch: false,
      autoFocus: true
    };
  }

  static getInstance(): MobileCameraOptimizer {
    if (!MobileCameraOptimizer.instance) {
      MobileCameraOptimizer.instance = new MobileCameraOptimizer();
    }
    return MobileCameraOptimizer.instance;
  }

  async detectDeviceCapabilities(): Promise<{
    hasBackCamera: boolean;
    hasFrontCamera: boolean;
    hasTorch: boolean;
    maxResolution: string;
    supportedFrameRates: number[];
  }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      const hasBackCamera = videoDevices.some(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      
      const hasFrontCamera = videoDevices.some(device => 
        device.label.toLowerCase().includes('front') || 
        device.label.toLowerCase().includes('user')
      );

      // Simple torch detection (will be properly detected when scanner initializes)
      const hasTorch = 'torch' in navigator.mediaDevices.getSupportedConstraints();

      return {
        hasBackCamera,
        hasFrontCamera,
        hasTorch,
        maxResolution: 'high', // Simplified for demo
        supportedFrameRates: [15, 30, 60]
      };
    } catch (error) {
      console.error('MobileCameraOptimizer: Failed to detect capabilities:', error);
      return {
        hasBackCamera: true,
        hasFrontCamera: false,
        hasTorch: false,
        maxResolution: 'medium',
        supportedFrameRates: [30]
      };
    }
  }

  async optimizeForDevice(): Promise<MobileOptimizationSettings> {
    const capabilities = await this.detectDeviceCapabilities();
    
    // Optimize based on device capabilities
    if (capabilities.hasBackCamera) {
      this.currentSettings.preferredCamera = 'back';
    }
    
    if (capabilities.hasTorch) {
      this.currentSettings.enableTorch = true;
    }
    
    // Adjust resolution based on device performance
    const isLowEndDevice = this.detectLowEndDevice();
    if (isLowEndDevice) {
      this.currentSettings.resolution = 'low';
      this.currentSettings.frameRate = 15;
    }

    console.log('MobileCameraOptimizer: Optimized settings:', this.currentSettings);
    return this.currentSettings;
  }

  private detectLowEndDevice(): boolean {
    // Simple heuristic for detecting low-end devices
    const memory = (navigator as any).deviceMemory;
    const hardwareConcurrency = navigator.hardwareConcurrency;
    
    if (memory && memory < 2) return true;
    if (hardwareConcurrency && hardwareConcurrency < 4) return true;
    
    return false;
  }

  async optimizeForLighting(lightingCondition: string): Promise<void> {
    switch (lightingCondition) {
      case 'dark':
        this.currentSettings.enableTorch = true;
        toastService.info('Camera Optimization', 'Dark environment detected - enabling torch recommendations');
        break;
      case 'bright':
        this.currentSettings.enableTorch = false;
        toastService.info('Camera Optimization', 'Bright environment detected - optimizing exposure');
        break;
      default:
        // Normal lighting - use default settings
        break;
    }
  }

  getConstraints(): MediaStreamConstraints {
    const videoConstraints: MediaTrackConstraints = {
      facingMode: this.currentSettings.preferredCamera === 'back' ? 'environment' : 'user',
      width: this.getResolutionConstraints(),
      height: this.getResolutionConstraints(),
      frameRate: this.currentSettings.frameRate
    };

    // Note: focusMode is not supported in standard MediaTrackConstraints
    // Auto focus is typically handled automatically by the camera

    return {
      video: videoConstraints,
      audio: false
    };
  }

  private getResolutionConstraints() {
    switch (this.currentSettings.resolution) {
      case 'low':
        return { ideal: 480 };
      case 'medium':
        return { ideal: 720 };
      case 'high':
        return { ideal: 1080 };
      default:
        return { ideal: 720 };
    }
  }

  getCurrentSettings(): MobileOptimizationSettings {
    return { ...this.currentSettings };
  }

  updateSettings(newSettings: Partial<MobileOptimizationSettings>): void {
    this.currentSettings = { ...this.currentSettings, ...newSettings };
    console.log('MobileCameraOptimizer: Settings updated:', this.currentSettings);
  }
}

export const mobileCameraOptimizer = MobileCameraOptimizer.getInstance();
