
export const triggerHapticFeedback = (): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};
