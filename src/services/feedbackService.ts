
class FeedbackService {
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.log('Web Audio API not supported');
    }
  }

  playSuccessBeep() {
    if (!this.audioContext) return;

    try {
      // Resume audio context if it's suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Two-tone success beep
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.1);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Failed to play beep:', error);
    }
  }

  vibrate() {
    try {
      if ('vibrate' in navigator) {
        // Pattern: vibrate 100ms, pause 50ms, vibrate 100ms
        navigator.vibrate([100, 50, 100]);
      }
    } catch (error) {
      console.log('Vibration not supported');
    }
  }

  successFeedback() {
    console.log('FeedbackService: Playing success feedback');
    this.playSuccessBeep();
    this.vibrate();
  }
}

export const feedbackService = new FeedbackService();
