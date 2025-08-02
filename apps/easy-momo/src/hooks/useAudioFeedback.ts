
import { useCallback } from 'react';

export const useAudioFeedback = () => {
  const playSuccessBeep = useCallback(() => {
    try {
      // Create AudioContext for better browser support
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a short success beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure the beep
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      // Also trigger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 100]);
      }
    } catch (error) {
      console.log('Audio feedback not available:', error);
      // Fallback to just haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 100]);
      }
    }
  }, []);

  const playErrorSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create error sound (lower frequency)
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 100, 100]);
      }
    } catch (error) {
      console.log('Error audio feedback not available:', error);
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 100, 100]);
      }
    }
  }, []);

  return {
    playSuccessBeep,
    playErrorSound
  };
};
