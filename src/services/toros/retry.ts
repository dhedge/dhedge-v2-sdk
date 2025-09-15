export async function retry<T>({
  fn,
  maxRetries = 3,
  delayMs = 1000
}: {
  fn: () => Promise<T>;
  maxRetries?: number;
  delayMs?: number;
}): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) {
        throw new Error(`Retry failed after ${maxRetries} attempts: ${err}`);
      }

      console.warn(
        `Retry ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms`,
        err
      );
      await new Promise(res => setTimeout(res, delayMs));
    }
  }

  // Should never reach here
  throw new Error("Unexpected retry failure");
}
