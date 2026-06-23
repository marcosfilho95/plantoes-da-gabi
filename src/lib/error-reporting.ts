type ClientErrorOptions = {
  componentStack?: string;
  errorBoundary?: string;
};

type ClientEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: ClientErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __clientEvents?: ClientEvents;
  }
}

export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__clientEvents?.captureException?.(error, context);
}
