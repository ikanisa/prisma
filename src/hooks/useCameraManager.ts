
import { useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export const useCameraManager = () => {
  const [cameraDevices, setCameraDevices] = useState<any[]>([]);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Enhanced camera device enumeration
  const getCameraDevices = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      console.log("Available camera devices:", devices);
      setCameraDevices(devices);
      return devices;
    } catch (error) {
      console.error("Failed to get camera devices:", error);
      return [];
    }
  };

  // Performance-aware scanner configuration
  const getPerformanceOptimizedConfig = () => {
    // Detect device performance
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    
    let fps = 10;
    let qrBoxSize = 280;
    
    // Adjust for low-performance devices
    if (memory < 3 || cores < 4) {
      fps = 6;
      qrBoxSize = 240;
    } else if (memory >= 8 && cores >= 8) {
      fps = 15;
      qrBoxSize = 320;
    }
    
    return {
      fps,
      qrbox: { width: qrBoxSize, height: qrBoxSize },
      aspectRatio: 1.0,
      disableFlip: false,
      showTorchButtonIfSupported: memory >= 4,
      showZoomSliderIfSupported: memory >= 6
    };
  };

  // Smart camera selection with fallback logic
  const selectOptimalCamera = (devices: any[]) => {
    const rearCamera = devices.find(device => 
      device.label?.toLowerCase().includes('back') || 
      device.label?.toLowerCase().includes('rear') ||
      device.label?.toLowerCase().includes('environment')
    );
    
    return rearCamera ? rearCamera.id : devices[0]?.id;
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (error) {
        console.log("Scanner was not running");
      }
    }
  };

  return {
    cameraDevices,
    setCameraDevices,
    html5QrCodeRef,
    videoRef,
    getCameraDevices,
    getPerformanceOptimizedConfig,
    selectOptimalCamera,
    stopScanner
  };
};
