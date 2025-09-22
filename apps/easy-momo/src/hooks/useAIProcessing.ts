
import { useRef, useState } from "react";
import { cloudFunctions } from "@/services/cloudFunctions";
import { toast } from "@/hooks/use-toast";

export const useAIProcessing = () => {
  const [isProcessingWithAI, setIsProcessingWithAI] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processWithAI = async (videoRef: React.RefObject<HTMLVideoElement>, setScanResult: (result: string) => void, setScanStatus: (status: any) => void) => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsProcessingWithAI(true);
    setScanStatus("processing");
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0);
      
      // Convert to base64
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      // Send to backend for AI processing
      const result = await cloudFunctions.scanQRCodeImage(imageBase64);
      
      if (result.ussdString) {
        setScanResult(result.ussdString);
        setScanStatus("success");
        if ("vibrate" in navigator) {
          navigator.vibrate(120);
        }
        toast({
          title: "QR Code Decoded!",
          description: "AI successfully decoded the QR code",
        });
      } else {
        setScanStatus("fail");
        toast({
          title: "Could not decode QR",
          description: "Try positioning the QR code better in the frame",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('AI processing error:', error);
      setScanStatus("fail");
      toast({
        title: "Processing failed",
        description: "Could not process the image with AI",
        variant: "destructive"
      });
    } finally {
      setIsProcessingWithAI(false);
    }
  };

  return {
    isProcessingWithAI,
    canvasRef,
    processWithAI
  };
};
