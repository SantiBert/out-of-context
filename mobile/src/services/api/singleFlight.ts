export function createSingleFlight() {
  let pending = false;

  return async function run<T>(task: () => Promise<T>): Promise<T | undefined> {
    if (pending) {
      return undefined;
    }
    pending = true;
    try {
      return await task();
    } finally {
      pending = false;
    }
  };
}
