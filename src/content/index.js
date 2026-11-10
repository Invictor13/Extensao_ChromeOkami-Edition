/**
 * Injeta a instância raiz do Okami HUD no DOM da página hospedeira
 * e gerencia a sincronização de mensagens para o modo imersivo.
 */
(function (globalScope) {
  const OKAMI_HUD_CUSTOM_ELEMENT =
    globalScope.OKAMI_HUD_CUSTOM_ELEMENT || 'okami-hud-root';

  const CONTROLLER_REGISTRY_SYMBOL =
    globalScope.CONTROLLER_REGISTRY_SYMBOL || Symbol.for('okami.hud.controller');
  const SHADOW_ROOT_REGISTRY_SYMBOL =
    globalScope.SHADOW_ROOT_REGISTRY_SYMBOL || Symbol.for('okami.hud.shadowRoot');
  const RUNTIME_STATE_SYMBOL = Symbol.for('okami.hud.runtimeState');

  const MESSAGE_ACTIONS = {
    TOGGLE_IMMERSIVE: 'OKAMI_TOGGLE_IMMERSIVE',
    EXIT_IMMERSIVE: 'OKAMI_EXIT_IMMERSIVE',
    GET_IMMERSIVE_STATE: 'OKAMI_GET_IMMERSIVE_STATE',
    IMMERSIVE_STATE_CHANGED: 'OKAMI_IMMERSIVE_STATE_CHANGED',
    TOGGLE_HUD_VISIBILITY: 'OKAMI_TOGGLE_HUD_VISIBILITY',
    PING: 'OKAMI_PING',
  };

  const READINESS_STATUS = {
    INITIALIZING: 'initializing',
    READY: 'ready',
    ERROR: 'error',
  };

  // Mantém ou recupera o estado de runtime compartilhado no contexto isolado
  const runtimeState = globalScope[RUNTIME_STATE_SYMBOL] || {
    status: READINESS_STATUS.INITIALIZING,
    isListenerRegistered: false,
    hudInstance: null,
    shadowRoot: null,
    hudController: null,
    pendingImmersiveState: null,
    lastError: null,
  };
  globalScope[RUNTIME_STATE_SYMBOL] = runtimeState;

  function logInfo(message, ...args) {
    console.log(`[Okami HUD] ${message}`, ...args);
  }

  function logError(message, error) {
    console.error(`[Okami HUD:Error] ${message}`, error);
  }

  function getActiveController() {
    if (runtimeState.hudController) return runtimeState.hudController;
    if (runtimeState.hudInstance) {
      if (runtimeState.hudInstance[CONTROLLER_REGISTRY_SYMBOL]) {
        runtimeState.hudController = runtimeState.hudInstance[CONTROLLER_REGISTRY_SYMBOL];
        return runtimeState.hudController;
      }
      if (typeof runtimeState.hudInstance.getHUDController === 'function') {
        runtimeState.hudController = runtimeState.hudInstance.getHUDController();
        return runtimeState.hudController;
      }
    }
    const domElem = document.querySelector(OKAMI_HUD_CUSTOM_ELEMENT);
    if (domElem) {
      if (domElem[CONTROLLER_REGISTRY_SYMBOL]) {
        runtimeState.hudController = domElem[CONTROLLER_REGISTRY_SYMBOL];
        return runtimeState.hudController;
      }
      if (typeof domElem.getHUDController === 'function') {
        runtimeState.hudController = domElem.getHUDController();
        return runtimeState.hudController;
      }
    }
    return null;
  }

  function applyImmersiveState(isImmersive, options = {}) {
    const state = Boolean(isImmersive);
    runtimeState.pendingImmersiveState = state;
    const flash = typeof options === 'boolean' ? options : (options?.flash ?? false);

    const controller = getActiveController();
    if (controller && typeof controller.setImmersiveState === 'function') {
      controller.setImmersiveState(state, { flash });
      return;
    }

    if (runtimeState.hudInstance && typeof runtimeState.hudInstance.setImmersiveState === 'function') {
      runtimeState.hudInstance.setImmersiveState(state, { flash });
      return;
    }

    const shadowRoot = runtimeState.shadowRoot || runtimeState.hudInstance?.[SHADOW_ROOT_REGISTRY_SYMBOL];
    if (shadowRoot && typeof globalScope.updateHUDImmersiveStateInShadow === 'function') {
      globalScope.updateHUDImmersiveStateInShadow(shadowRoot, state);
    }
  }

  function toggleHUDVisibility() {
    const controller = getActiveController();
    if (controller && typeof controller.toggleTopBar === 'function') {
      controller.toggleTopBar();
      return;
    }

    if (runtimeState.hudInstance && typeof runtimeState.hudInstance.toggleTopBar === 'function') {
      runtimeState.hudInstance.toggleTopBar();
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

  function buildReadinessContract() {
    const controller = getActiveController();
    const hasElement = Boolean(runtimeState.hudInstance || document.querySelector(OKAMI_HUD_CUSTOM_ELEMENT));
    const hasController = Boolean(controller);
    const isReady = hasElement && hasController && runtimeState.status !== READINESS_STATUS.ERROR;

    let computedStatus = READINESS_STATUS.INITIALIZING;
    if (runtimeState.status === READINESS_STATUS.ERROR) {
      computedStatus = READINESS_STATUS.ERROR;
    } else if (isReady) {
      computedStatus = READINESS_STATUS.READY;
    }

    return {
      status: computedStatus,
      version: '0.1.0',
      readiness: {
        listenerRegistered: true,
        hudElementInjected: hasElement,
        controllerAvailable: hasController,
        isImmersiveSynced: runtimeState.pendingImmersiveState !== null,
      },
      lastError: runtimeState.lastError ? String(runtimeState.lastError) : null,
    };
  }

  function setupMessageListeners() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
    if (runtimeState.isListenerRegistered) return;

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      try {
        if (message?.action === MESSAGE_ACTIONS.PING) {
          if (typeof sendResponse === 'function') {
            sendResponse(buildReadinessContract());
          }
          return;
        }

        if (message?.action === MESSAGE_ACTIONS.IMMERSIVE_STATE_CHANGED) {
          applyImmersiveState(Boolean(message.isImmersive), {
            flash: Boolean(message.flash ?? message.isImmersive),
          });
        } else if (message?.action === MESSAGE_ACTIONS.TOGGLE_HUD_VISIBILITY) {
          toggleHUDVisibility();
        }
      } catch (err) {
        logError('Erro no listener de mensagens do content script:', err);
      }
    });
    runtimeState.isListenerRegistered = true;
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
      // Registra o Custom Element se suportado no contexto de execução
      if (typeof globalScope.registerOkamiHUDRoot === 'function') {
        globalScope.registerOkamiHUDRoot();
      }

      // Verifica se já existe uma instância no DOM
      const existingInstance = document.querySelector(OKAMI_HUD_CUSTOM_ELEMENT);
      if (existingInstance) {
        // Tenta recuperar o controlador ativo via registro privado
        const existingController =
          existingInstance[CONTROLLER_REGISTRY_SYMBOL] ||
          (typeof existingInstance.getHUDController === 'function' ? existingInstance.getHUDController() : null);

        if (existingController && typeof existingController.toggleTopBar === 'function') {
          logInfo('Instância e controlador do Okami HUD reutilizados do registro privado.');
          runtimeState.hudInstance = existingInstance;
          runtimeState.hudController = existingController;
          runtimeState.shadowRoot = existingInstance[SHADOW_ROOT_REGISTRY_SYMBOL] || null;
          runtimeState.status = READINESS_STATUS.READY;

          if (runtimeState.pendingImmersiveState !== null) {
            applyImmersiveState(runtimeState.pendingImmersiveState);
          }
          return existingInstance;
        }

        // Se a instância existente for órfã ou desprovida de controlador (ex: reinjeção com perda de estado),
        // remove o elemento antigo de forma limpa antes de recriar
        logInfo('Instância órfã encontrada no DOM sem controlador funcional. Recriando elemento.');
        if (existingInstance[CONTROLLER_REGISTRY_SYMBOL]?.destroy) {
          existingInstance[CONTROLLER_REGISTRY_SYMBOL].destroy();
        }
        if (typeof existingInstance.remove === 'function') {
          existingInstance.remove();
        } else if (existingInstance.parentNode) {
          existingInstance.parentNode.removeChild(existingInstance);
        }
      }

      // Cria o elemento raiz limpo
      const hudRoot = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);

      // Em content scripts isolados do Chrome, window.customElements é null por padrão de segurança
      // e o elemento não é promovido a OkamiHUDRoot. Nesses casos, acoplamos o Shadow DOM fechado
      // diretamente no elemento e salvamos no registro privado.
      const OkamiHUDRootClass = globalScope.OkamiHUDRoot;
      let controller = null;
      let shadowRoot = null;

      if (!OkamiHUDRootClass || !(hudRoot instanceof OkamiHUDRootClass)) {
        shadowRoot = hudRoot.attachShadow({ mode: 'closed' });
        hudRoot[SHADOW_ROOT_REGISTRY_SYMBOL] = shadowRoot;
        if (typeof globalScope.renderOkamiHUDInShadow === 'function') {
          controller = globalScope.renderOkamiHUDInShadow(shadowRoot);
          hudRoot[CONTROLLER_REGISTRY_SYMBOL] = controller;
        }
      } else {
        // Quando for instância de OkamiHUDRootClass
        controller = hudRoot[CONTROLLER_REGISTRY_SYMBOL] || (hudRoot.getHUDController ? hudRoot.getHUDController() : null);
        shadowRoot = hudRoot[SHADOW_ROOT_REGISTRY_SYMBOL] || null;
      }

      runtimeState.hudInstance = hudRoot;
      runtimeState.hudController = controller;
      runtimeState.shadowRoot = shadowRoot;

      (document.body || document.documentElement).appendChild(hudRoot);

      // Caso tenha sido instanciado via custom elements conectado após append
      if (!runtimeState.hudController) {
        runtimeState.hudController =
          hudRoot[CONTROLLER_REGISTRY_SYMBOL] ||
          (typeof hudRoot.getHUDController === 'function' ? hudRoot.getHUDController() : null);
      }

      runtimeState.status = READINESS_STATUS.READY;

      // Se havia um estado imersivo recebido antes da injeção ser concluída, aplica imediatamente
      if (runtimeState.pendingImmersiveState !== null) {
        applyImmersiveState(runtimeState.pendingImmersiveState);
      }

      logInfo('Okami HUD injetado com sucesso com isolamento Shadow DOM e prontidão confirmada.');
      return hudRoot;
    } catch (err) {
      runtimeState.status = READINESS_STATUS.ERROR;
      runtimeState.lastError = err;
      logError('Falha ao injetar Okami HUD na página:', err);
      return null;
    }
  }

  // Exporta para escopo global para consumo por testes ou scripts
  globalScope.injectOkamiHUD = injectOkamiHUD;
  globalScope.requestExitImmersiveMode = requestExitImmersiveMode;
  globalScope.applyImmersiveState = applyImmersiveState;
  globalScope.toggleHUDVisibility = toggleHUDVisibility;
  globalScope.setupMessageListeners = setupMessageListeners;
  globalScope.queryInitialState = queryInitialState;
  globalScope.buildReadinessContract = buildReadinessContract;
  globalScope.getActiveController = getActiveController;
  globalScope.getCurrentHUDController = () => getActiveController();
  globalScope.getPendingImmersiveState = () => runtimeState.pendingImmersiveState;
  globalScope.getRuntimeState = () => runtimeState;
  globalScope.resetContentScriptStateForTesting = () => {
    if (runtimeState.hudController && typeof runtimeState.hudController.destroy === 'function') {
      runtimeState.hudController.destroy();
    }
    runtimeState.status = READINESS_STATUS.INITIALIZING;
    runtimeState.isListenerRegistered = false;
    runtimeState.hudInstance = null;
    runtimeState.shadowRoot = null;
    runtimeState.hudController = null;
    runtimeState.pendingImmersiveState = null;
    runtimeState.lastError = null;
  };

  function initContentScript() {
    setupMessageListeners();

    if (document.readyState === 'loading') {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          injectOkamiHUD();
          queryInitialState();
        },
        { once: true }
      );
    } else {
      injectOkamiHUD();
      queryInitialState();
    }
  }

  // Inicializa a injeção e comunicação respeitando o ciclo de vida do DOM
  if (typeof document !== 'undefined') {
    initContentScript();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
