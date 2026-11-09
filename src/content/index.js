/**
 * Injeta a instância raiz do Okami HUD no DOM da página hospedeira.
 * Garante unicidade e não interfere nas interações nativas da página.
 */
(function (globalScope) {
  const OKAMI_HUD_CUSTOM_ELEMENT =
    globalScope.OKAMI_HUD_CUSTOM_ELEMENT || 'okami-hud-root';

  function logInfo(message, ...args) {
    console.log(`[Okami HUD] ${message}`, ...args);
  }

  function logError(message, error) {
    console.error(`[Okami HUD:Error] ${message}`, error);
  }

  function injectOkamiHUD() {
    try {
      // Evita duplicação caso o content script seja reinjetado
      const existingInstance = document.querySelector(OKAMI_HUD_CUSTOM_ELEMENT);
      if (existingInstance) {
        logInfo('Instância do Okami HUD já existe no DOM. Ignorando injeção duplicada.');
        return existingInstance;
      }

      // Registra o Custom Element se suportado no contexto de execução
      if (typeof globalScope.registerOkamiHUDRoot === 'function') {
        globalScope.registerOkamiHUDRoot();
      }

      // Cria o elemento raiz
      const hudRoot = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);

      // Em content scripts isolados do Chrome, window.customElements é null por padrão de segurança
      // e o elemento não é instanciado como OkamiHUDRoot.
      // Nesses casos, acoplamos o Shadow DOM fechado diretamente no elemento para garantir
      // o mesmo isolamento estético e a renderização do HUD.
      const OkamiHUDRootClass = globalScope.OkamiHUDRoot;
      if (!OkamiHUDRootClass || !(hudRoot instanceof OkamiHUDRootClass)) {
        const shadowRoot = hudRoot.attachShadow({ mode: 'closed' });
        if (typeof globalScope.renderOkamiHUDInShadow === 'function') {
          globalScope.renderOkamiHUDInShadow(shadowRoot);
        }
      }

      (document.body || document.documentElement).appendChild(hudRoot);

      logInfo('Okami HUD injetado com sucesso com isolamento Shadow DOM.');
      return hudRoot;
    } catch (err) {
      logError('Falha ao injetar Okami HUD na página:', err);
      return null;
    }
  }

  // Exporta para escopo global para consumo por testes ou scripts
  globalScope.injectOkamiHUD = injectOkamiHUD;

  // Inicializa a injeção respeitando o estado do DOM
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => injectOkamiHUD(), { once: true });
    } else {
      injectOkamiHUD();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
