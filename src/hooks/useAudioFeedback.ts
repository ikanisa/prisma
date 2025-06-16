
import { useCallback, useRef } from 'react';

interface AudioFeedbackOptions {
  enableScanBeep?: boolean;
  enableFailureSound?: boolean;
  enableProcessingSound?: boolean;
  volume?: number;
}

export const useAudioFeedback = (options: AudioFeedbackOptions = {}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const {
    enableScanBeep = true,
    enableFailureSound = true,
    enableProcessingSound = false,
    volume = 0.3
  } = options;

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.log('[Audio] Web Audio API not supported');
        return null;
      }
    }
    return audioContextRef.current;
  }, []);

  // Create tone with specific frequency and duration
  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.log('[Audio] Failed to play tone:', error);
    }
  }, [getAudioContext, volume]);

  // Success beep - pleasant ascending tone
  const playSuccessBeep = useCallback(() => {
    if (!enableScanBeep) return;
    
    // Two-tone success beep
    playTone(800, 0.15, 'sine');
    setTimeout(() => playTone(1000, 0.15, 'sine'), 100);
    
    console.log('[Audio] Playing success beep');
  }, [enableScanBeep, playTone]);

  // Failure sound - lower frequency descending tone
  const playFailureSound = useCallback(() => {
    if (!enableFailureSound) return;
    
    playTone(400, 0.2, 'triangle');
    setTimeout(() => playTone(300, 0.2, 'triangle'), 150);
    
    console.log('[Audio] Playing failure sound');
  }, [enableFailureSound, playTone]);

  // Processing sound - subtle clicking
  const playProcessingSound = useCallback(() => {
    if (!enableProcessingSound) return;
    
    playTone(600, 0.1, 'square');
    
    console.log('[Audio] Playing processing sound');
  }, [enableProcessingSound, playTone]);

  // Scanning active sound - very subtle pulse
  const playScanningPulse = useCallback(() => {
    if (!enableProcessingSound) return;
    
    playTone(500, 0.05, 'sine');
  }, [enableProcessingSound, playTone]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  return {
    playSuccessBeep,
    playFailureSound,
    playProcessingSound,
    playScanningPulse,
    cleanup
  };
};
