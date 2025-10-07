export const logger = {
  warn: (message: string, data?: unknown) => {
    if (data !== undefined) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  },
  error: (message: string, error?: unknown) => {
    if (error !== undefined) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  },
};
