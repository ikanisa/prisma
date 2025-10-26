export async function retry<T>(fn: () => Promise<T>, opts: { retries?: number; factor?: number; minTimeout?: number } = {}) {
  const { retries = 3, factor = 2, minTimeout = 100 } = opts;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      const delay = minTimeout * Math.pow(factor, attempt - 1);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}
