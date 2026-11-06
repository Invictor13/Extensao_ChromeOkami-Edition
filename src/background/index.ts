import { EXTENSION_NAME, EXTENSION_VERSION } from '../shared/constants';
import { logInfo, logError } from '../shared/utils/logger';

/**
 * Ponto de entrada do Background Service Worker do Okami HUD.
 */
export function initializeBackground(): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onInstalled.addListener((details) => {
        try {
          logInfo(
            `Service Worker inicializado com sucesso. Versão: ${EXTENSION_VERSION}. Motivo: ${details.reason}`
          );
        } catch (err) {
          logError('Falha no listener onInstalled:', err);
        }
      });

      chrome.runtime.onStartup?.addListener(() => {
        try {
          logInfo('Service Worker reativado em onStartup.');
        } catch (err) {
          logError('Falha no listener onStartup:', err);
        }
      });
    }

    logInfo(`${EXTENSION_NAME} Service Worker registrado.`);
  } catch (err) {
    logError('Erro fatal na inicialização do Background Service Worker:', err);
  }
}

// Execução automática na carga do worker
initializeBackground();
