/**
 * Injeta a instância raiz do Okami HUD no DOM da página hospedeira
 * e gerencia a sincronização de mensagens para o modo imersivo.
 */
(function (globalScope) {
  const OKAMI_HUD_CUSTOM_ELEMENT =
    globalScope.OKAMI_HUD_CUSTOM_ELEMENT || 'okami-hud-root';

  const MESSAGE_ACTIONS = {
    TOGGLE_IMMERSIVE: 'OKAMI_TOGGLE_IMMERSIVE',
    EXIT_IMMERSIVE: 'OKAMI_EXIT_IMMERSIVE',
    GET_IMMERSIVE_STATE: 'OKAMI_GET_IMMERSIVE_STATE',
    IMMERSIVE_STATE_CHANGED: 'OKAMI_IMMERSIVE_STATE_CHANGED',
  };

  let currentHudInstance = null;
  let currentShadowRoot = null;

  function logInfo(message, ...args) {
    console.log(`[Okami HUD] ${message}`, ...args);
  }

  function logError(message, error) {
    console.error(`[Okami HUD:Error] ${message}`, error);
  }

  function applyImmersiveState(isImmersive) {
    if (currentHudInstance && typeof currentHudInstance.setImmersiveState === 'function') {
      currentHudInstance.setImmersiveState(isImmersive);
    } else if (currentShadowRoot && typeof globalScope.updateExitButtonInShadow === 'function') {
      globalScope.updateExitButtonInShadow(currentShadowRoot, isImmersive);
    }
  }

  function requestExitImmersiveMode() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(
          { action: MESSAGE_ACTIONS.EXIT_IMMERSIVE },
          (response) => {
            if (chrome.runtime.lastError) {
              logError('Erro ao comunicar saída de modo imersivo:', chrome.runtime.lastError);
            } else if (response && response.success === false) {
              logError('Falha ao processar saída do modo imersivo no Background.');
            }
          }
        );
      }
    } catch (err) {
      logError('Falha ao enviar mensagem de saída de modo imersivo:', err);
    }
  }

  function setupMessageListeners() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    chrome.runtime.onMessage.addListener((message) => {
      try {
        if (message?.action === MESSAGE_ACTIONS.IMMERSIVE_STATE_CHANGED) {
          applyImmersiveState(Boolean(message.isImmersive));
        }
      } catch (err) {
        logError('Erro no listener de mensagens do content script:', err);
      }
    });
  }

  function queryInitialState() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(
          { action: MESSAGE_ACTIONS.GET_IMMERSIVE_STATE },
          (response) => {
            if (!chrome.runtime.lastError && response) {
              applyImmersiveState(Boolean(response.isImmersive));
            }
          }
        );
      }
    } catch (_err) {
      // Ignora erro silenciosamente se service worker estiver inativo ou indisponível
    }
  }

  function injectOkamiHUD() {
    try {
      // Evita duplicação caso o content script seja reinjetado
      const existingInstance = document.querySelector(OKAMI_HUD_CUSTOM_ELEMENT);
      if (existingInstance) {
        logInfo('Instância do Okami HUD já existe no DOM. Ignorando injeção duplicada.');
        currentHudInstance = existingInstance;
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
        currentShadowRoot = shadowRoot;
        if (typeof globalScope.renderOkamiHUDInShadow === 'function') {
          globalScope.renderOkamiHUDInShadow(shadowRoot);
        }
      }

      currentHudInstance = hudRoot;
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
  globalScope.requestExitImmersiveMode = requestExitImmersiveMode;
  globalScope.applyImmersiveState = applyImmersiveState;
  globalScope.setupMessageListeners = setupMessageListeners;
  globalScope.queryInitialState = queryInitialState;

  // Inicializa a injeção e comunicação respeitando o estado do DOM
  if (typeof document !== 'undefined') {
    setupMessageListeners();
    queryInitialState();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => injectOkamiHUD(), { once: true });
    } else {
      injectOkamiHUD();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
