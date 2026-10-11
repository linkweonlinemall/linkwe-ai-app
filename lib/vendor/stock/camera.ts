export type StockCameraDriver = {
  start: (onDecode: (value: string) => void) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
};

/** One capture per explicit start; even frames emitted during asynchronous teardown are ignored. */
export function createStockCameraSession(createDriver: () => Promise<StockCameraDriver>, onDecode: (value: string) => void,
  onReady: () => void, onError: () => void) {
  let cancelled = false;
  let captured = false;
  let driver: StockCameraDriver | null = null;
  let release: Promise<void> | null = null;
  const starting = Promise.resolve().then(async () => {
    if (cancelled) return;
    driver = await createDriver();
    if (cancelled) return;
    await driver.start(value => {
      if (cancelled || captured) return;
      captured = true;
      void stop();
      onDecode(value);
    });
    if (!cancelled) onReady();
  }).catch(() => {
    if (!cancelled) onError();
    void stop();
  });
  function stop(): Promise<void> {
    cancelled = true;
    release ??= starting.then(async () => {
      try { await driver?.stop(); } catch { /* A failed start may have no running stream. */ }
      try { driver?.clear(); } catch { /* The component may already have unmounted. */ }
    });
    return release;
  }
  return { stop };
}
