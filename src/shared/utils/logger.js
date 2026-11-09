/**
 * Utilitário de log seguro para o Okami HUD.
 */
export function logInfo(message, ...args) {
  // Log discreto identificando o módulo
  console.log(`[Okami HUD] ${message}`, ...args);
}

export function logError(message, error) {
  console.error(`[Okami HUD:Error] ${message}`, error);
}
