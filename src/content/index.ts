import { OKAMI_HUD_CUSTOM_ELEMENT } from '../shared/constants';
import { logInfo, logError } from '../shared/utils/logger';
import { registerOkamiHUDRoot, renderOkamiHUDInShadow, OkamiHUDRoot } from './components/OkamiHUDRoot';

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

    // Registra o Custom Element se suportado no contexto de execução
    registerOkamiHUDRoot();

    // Cria o elemento raiz
    const hudRoot = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);

    // Em content scripts isolados do Chrome, window.customElements é null por padrão de segurança
    // e o elemento não é instanciado como OkamiHUDRoot.
    // Nesses casos, acoplamos o Shadow DOM fechado diretamente no elemento para garantir
    // o mesmo isolamento estético e a renderização do HUD.
    if (!(hudRoot instanceof OkamiHUDRoot)) {
      const shadowRoot = hudRoot.attachShadow({ mode: 'closed' });
      renderOkamiHUDInShadow(shadowRoot);
    }

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
