export function logInfo(message: string): void {
  process.stdout.write(`${new Date().toISOString()} ${message}\n`);
}

export function logError(message: string, error: unknown): void {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${new Date().toISOString()} ${message}: ${detail}\n`);
}
