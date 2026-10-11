// Mermaid measures temporary body children. Wait at queue execution time, not
// just enqueue time: visibility can change while another diagram is rendering.
export function waitForRenderedDocument(signal) {
  return new Promise((resolve, reject) => {
    let timer;
    let observer;
    const cleanup = () => {
      clearInterval(timer);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', check);
      signal.removeEventListener('abort', abort);
    };
    const abort = () => { cleanup(); reject(new DOMException('Diagram render cancelled', 'AbortError')); };
    const check = () => {
      if (signal.aborted) { abort(); return; }
      if (document.visibilityState !== 'hidden' && document.body?.getClientRects().length) {
        cleanup(); resolve();
      }
    };
    document.addEventListener('visibilitychange', check);
    signal.addEventListener('abort', abort, { once: true });
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(check);
      observer.observe(document.documentElement);
    }
    // Containing iframe geometry may change without visibilitychange.
    timer = setInterval(check, 250);
    check();
  });
}
