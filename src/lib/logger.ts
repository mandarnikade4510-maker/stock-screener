/** Single sink for error reporting; swap the body for Sentry/Datadog in production. */
export function logError(scope: string, error: unknown, info?: unknown): void {
  console.error(`[screener:${scope}]`, error, info ?? '');
}
