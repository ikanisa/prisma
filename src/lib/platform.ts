
export const isDesktop = () => {
  return typeof window !== 'undefined' &&
         '__TAURI__' in window;
};

export const isMacOS = () => {
  return isDesktop() && navigator.platform.includes('Mac');
};
