/**
 * Utilitário de log seguro para o Okami HUD.
 */
export function logInfo(message: string, ...args: unknown[]): void {
  // Log discreto identificando o módulo
  console.log(`[Okami HUD] ${message}`, ...args);
}

export function logError(message: string, error?: unknown): void {
  console.error(`[Okami HUD:Error] ${message}`, error);
}
