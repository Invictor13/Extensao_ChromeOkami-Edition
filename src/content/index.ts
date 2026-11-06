import { OKAMI_HUD_CUSTOM_ELEMENT } from '../shared/constants';
import { logInfo, logError } from '../shared/utils/logger';
import { registerOkamiHUDRoot } from './components/OkamiHUDRoot';

/**
 * Injeta a instância raiz do Okami HUD no DOM da página hospedeira.
 * Garante unicidade e não interfere nas interações nativas da página.
 */
export function injectOkamiHUD(): HTMLElement | null {
  try {
    // Evita duplicação caso o content script seja reinjetado
    const existingInstance = document.querySelector(OKAMI_HUD_CUSTOM_ELEMENT);
    if (existingInstance) {
      logInfo('Instância do Okami HUD já existe no DOM. Ignorando injeção duplicada.');
      return existingInstance as HTMLElement;
    }

    // Registra o Custom Element
    registerOkamiHUDRoot();

    // Cria e insere o elemento raiz
    const hudRoot = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);
    (document.body || document.documentElement).appendChild(hudRoot);

    logInfo('Okami HUD injetado com sucesso com isolamento Shadow DOM.');
    return hudRoot;
  } catch (err) {
    logError('Falha ao injetar Okami HUD na página:', err);
    return null;
  }
}

// Inicializa a injeção respeitando o estado do DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => injectOkamiHUD(), { once: true });
} else {
  injectOkamiHUD();
}
