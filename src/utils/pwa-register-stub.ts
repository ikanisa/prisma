export function registerSW() {
  return () => {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[PWA] Service worker registration skipped (disabled).');
    }
  };
}
