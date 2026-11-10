/**
 * Custom Element raiz do Okami HUD.
 * Utiliza Shadow DOM fechado (`mode: 'closed'`) para isolar completamente seus estilos
 * e DOM da página hospedeira.
 */
(function (globalScope) {
  const OKAMI_HUD_CUSTOM_ELEMENT = 'okami-hud-root';
  const OKAMI_HUD_INDICATOR_ID = 'okami-hud-init-indicator';
  const OKAMI_HUD_TOP_BAR_ID = 'okami-hud-top-bar';
  const OKAMI_HUD_TRIGGER_ZONE_ID = 'okami-hud-top-trigger';
  const OKAMI_HUD_EXIT_BUTTON_ID = 'okami-hud-exit-btn';
  const OKAMI_HUD_TOAST_ID = 'okami-hud-toast-feedback';
  const OKAMI_HUD_ADDRESS_BAR_ID = 'okami-hud-address-bar';
  const OKAMI_HUD_ADDRESS_INPUT_ID = 'okami-hud-address-input';
  const OKAMI_HUD_ADDRESS_CLEAR_ID = 'okami-hud-address-clear';
  const OKAMI_HUD_ADDRESS_STATUS_ID = 'okami-hud-address-status';

  const HUD_AUTOHIDE_DELAY_MS = 380;
  const HUD_INITIAL_REVEAL_DURATION_MS = 1800;

  // Chave de registro privado compartilhada no mundo isolado do content script
  const CONTROLLER_REGISTRY_SYMBOL = Symbol.for('okami.hud.controller');
  const SHADOW_ROOT_REGISTRY_SYMBOL = Symbol.for('okami.hud.shadowRoot');

  class OkamiHUDRoot extends HTMLElement {
    constructor() {
      super();
      // Shadow DOM fechado conforme decisão de arquitetura
      this._shadowRoot = this.attachShadow({ mode: 'closed' });
      this._isImmersive = false;
      this._hudController = null;

      // Armazena no registro privado do elemento
      this[SHADOW_ROOT_REGISTRY_SYMBOL] = this._shadowRoot;
    }

    connectedCallback() {
      this.render();
    }

    disconnectedCallback() {
      if (this._hudController && typeof this._hudController.destroy === 'function') {
        this._hudController.destroy();
      }
    }

    render() {
      if (this._hudController && typeof this._hudController.destroy === 'function') {
        this._hudController.destroy();
      }
      this._hudController = renderOkamiHUDInShadow(this._shadowRoot, {
        isImmersive: this._isImmersive,
      });
      this[CONTROLLER_REGISTRY_SYMBOL] = this._hudController;
    }

    setImmersiveState(isImmersive, options = {}) {
      this._isImmersive = Boolean(isImmersive);
      const shouldFlash = typeof options === 'boolean' ? options : (options?.flash ?? false);
      if (this._hudController && typeof this._hudController.setImmersiveState === 'function') {
        this._hudController.setImmersiveState(this._isImmersive, shouldFlash);
      } else {
        updateHUDImmersiveStateInShadow(this._shadowRoot, this._isImmersive);
      }
    }

    toggleTopBar() {
      if (this._hudController && typeof this._hudController.toggleTopBar === 'function') {
        this._hudController.toggleTopBar();
      }
    }

    /**
     * Métodos auxiliares para testes unitários ou inspeção interna.
     */
    hasRenderedBadge() {
      return (
        (typeof this._shadowRoot.getElementById === 'function'
          ? this._shadowRoot.getElementById(OKAMI_HUD_INDICATOR_ID)
          : this._shadowRoot.querySelector(`#${OKAMI_HUD_INDICATOR_ID}`)) !== null
      );
    }

    hasExitButton() {
      const exitBtn =
        typeof this._shadowRoot.getElementById === 'function'
          ? this._shadowRoot.getElementById(OKAMI_HUD_EXIT_BUTTON_ID)
          : this._shadowRoot.querySelector(`#${OKAMI_HUD_EXIT_BUTTON_ID}`);
      return exitBtn !== null;
    }

    hasTopBar() {
      return (
        (typeof this._shadowRoot.getElementById === 'function'
          ? this._shadowRoot.getElementById(OKAMI_HUD_TOP_BAR_ID)
          : this._shadowRoot.querySelector(`#${OKAMI_HUD_TOP_BAR_ID}`)) !== null
      );
    }

    hasAddressInput() {
      return (
        (typeof this._shadowRoot.getElementById === 'function'
          ? this._shadowRoot.getElementById(OKAMI_HUD_ADDRESS_INPUT_ID)
          : this._shadowRoot.querySelector(`#${OKAMI_HUD_ADDRESS_INPUT_ID}`)) !== null
      );
    }

    getAddressInput() {
      return (
        typeof this._shadowRoot.getElementById === 'function'
          ? this._shadowRoot.getElementById(OKAMI_HUD_ADDRESS_INPUT_ID)
          : this._shadowRoot.querySelector(`#${OKAMI_HUD_ADDRESS_INPUT_ID}`)
      );
    }

    setAddressValue(url) {
      if (this._hudController && typeof this._hudController.setAddressValue === 'function') {
        this._hudController.setAddressValue(url);
      }
    }

    getAddressValue() {
      return this._hudController && typeof this._hudController.getAddressValue === 'function'
        ? this._hudController.getAddressValue()
        : '';
    }

    setAddressStatus(status, message) {
      if (this._hudController && typeof this._hudController.setAddressStatus === 'function') {
        this._hudController.setAddressStatus(status, message);
      }
    }

    isTopBarVisible() {
      const topBar =
        typeof this._shadowRoot.getElementById === 'function'
          ? this._shadowRoot.getElementById(OKAMI_HUD_TOP_BAR_ID)
          : this._shadowRoot.querySelector(`#${OKAMI_HUD_TOP_BAR_ID}`);
      return Boolean(topBar && topBar.classList.contains('visible'));
    }

    getHUDController() {
      return this._hudController;
    }
  }

  /**
   * Constrói o botão de saída do modo imersivo.
   */
  function createExitButtonElement() {
    const exitBtn = document.createElement('button');
    exitBtn.id = OKAMI_HUD_EXIT_BUTTON_ID;
    exitBtn.className = 'okami-exit-btn';
    exitBtn.type = 'button';
    exitBtn.title = 'Sair do Modo Imersivo (Alt+Shift+F)';
    exitBtn.setAttribute('aria-label', 'Sair do Modo Imersivo');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'okami-exit-icon';
    iconSpan.textContent = '✕';
    iconSpan.setAttribute('aria-hidden', 'true');

    const textSpan = document.createElement('span');
    textSpan.className = 'okami-exit-text';
    textSpan.textContent = 'Sair';

    exitBtn.appendChild(iconSpan);
    exitBtn.appendChild(textSpan);

    exitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof globalScope.requestExitImmersiveMode === 'function') {
        globalScope.requestExitImmersiveMode();
      }
    });

    return exitBtn;
  }

  /**
   * Constrói o elemento da Barra Superior com três regiões distintas:
   * - Esquerda: Identidade visual Okami (insígnia/logo) + espaço para controles futuros.
   * - Central: Barra de Endereço e Navegação Funcional.
   * - Direita: Controles do escopo atual (slot reservado para botão de saída).
   */
  function createTopBarElement() {
    const topBar = document.createElement('header');
    topBar.id = OKAMI_HUD_TOP_BAR_ID;
    topBar.className = 'okami-top-bar';
    topBar.setAttribute('role', 'toolbar');
    topBar.setAttribute('aria-label', 'Okami HUD - Barra Superior de Navegação');

    // 1. Região Esquerda
    const leftSection = document.createElement('div');
    leftSection.className = 'okami-bar-section okami-section-left';

    const brand = document.createElement('div');
    brand.className = 'okami-brand';
    brand.setAttribute('title', 'Okami HUD');

    const brandIcon = document.createElement('span');
    brandIcon.className = 'okami-brand-icon';
    brandIcon.textContent = '◈'; // Símbolo geométrico refinado para Okami
    brandIcon.setAttribute('aria-hidden', 'true');

    const brandName = document.createElement('span');
    brandName.className = 'okami-brand-name';
    brandName.textContent = 'OKAMI';

    const brandBadge = document.createElement('span');
    brandBadge.className = 'okami-brand-badge';
    brandBadge.textContent = 'HUD';

    brand.appendChild(brandIcon);
    brand.appendChild(brandName);
    brand.appendChild(brandBadge);

    const leftControlsSlot = document.createElement('div');
    leftControlsSlot.className = 'okami-slot okami-slot-left';
    leftControlsSlot.setAttribute('aria-hidden', 'true');

    leftSection.appendChild(brand);
    leftSection.appendChild(leftControlsSlot);

    // 2. Região Central (Barra de Endereço e Navegação Funcional)
    const centerSection = document.createElement('div');
    centerSection.className = 'okami-bar-section okami-section-center';

    const addressBar = createAddressBarElement();
    centerSection.appendChild(addressBar);

    // 3. Região Direita
    const rightSection = document.createElement('div');
    rightSection.className = 'okami-bar-section okami-section-right';

    const rightControlsSlot = document.createElement('div');
    rightControlsSlot.className = 'okami-slot okami-slot-right';

    rightSection.appendChild(rightControlsSlot);

    topBar.appendChild(leftSection);
    topBar.appendChild(centerSection);
    topBar.appendChild(rightSection);

    return topBar;
  }

  /**
   * Constrói o container da barra de endereço e campo de navegação funcional.
   */
  function createAddressBarElement() {
    const addressBar = document.createElement('div');
    addressBar.id = OKAMI_HUD_ADDRESS_BAR_ID;
    addressBar.className = 'okami-address-bar status-idle';
    addressBar.setAttribute('role', 'search');

    // Ícone / Indicador de status (segurança / pesquisa / carregamento)
    const statusIcon = document.createElement('span');
    statusIcon.id = OKAMI_HUD_ADDRESS_STATUS_ID;
    statusIcon.className = 'okami-address-icon';
    statusIcon.setAttribute('aria-hidden', 'true');
    statusIcon.textContent = '🔒';

    // Campo de entrada de texto de endereço / busca
    const input = document.createElement('input');
    input.id = OKAMI_HUD_ADDRESS_INPUT_ID;
    input.className = 'okami-address-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.placeholder = 'Pesquisar ou digitar endereço web...';
    input.setAttribute('aria-label', 'Endereço web ou termo de busca');

    // Botão discreto para limpar conteúdo do campo
    const clearBtn = document.createElement('button');
    clearBtn.id = OKAMI_HUD_ADDRESS_CLEAR_ID;
    clearBtn.className = 'okami-address-clear-btn';
    clearBtn.type = 'button';
    clearBtn.tabIndex = -1;
    clearBtn.title = 'Limpar campo';
    clearBtn.setAttribute('aria-label', 'Limpar campo de endereço');
    clearBtn.textContent = '✕';

    addressBar.appendChild(statusIcon);
    addressBar.appendChild(input);
    addressBar.appendChild(clearBtn);

    return addressBar;
  }

  /**
   * Constrói a zona sensível no topo da tela para acionar a barra quando o cursor se aproximar da borda.
   */
  function createTriggerZoneElement() {
    const trigger = document.createElement('div');
    trigger.id = OKAMI_HUD_TRIGGER_ZONE_ID;
    trigger.className = 'okami-top-trigger';
    trigger.setAttribute('aria-hidden', 'true');
    return trigger;
  }

  /**
   * Insere ou remove o botão de saída do modo imersivo dentro da árvore do Shadow DOM.
   * Se existir a barra superior, insere dentro do slot da seção direita.
   * Caso contrário (ex: dummy Shadow root isolado em testes da PR03), insere diretamente na raiz.
   */
  function updateExitButtonInShadow(shadowRoot, isImmersive) {
    if (!shadowRoot) return;

    let exitBtn =
      typeof shadowRoot.getElementById === 'function'
        ? shadowRoot.getElementById(OKAMI_HUD_EXIT_BUTTON_ID)
        : shadowRoot.querySelector?.(`#${OKAMI_HUD_EXIT_BUTTON_ID}`);

    if (isImmersive) {
      if (!exitBtn) {
        exitBtn = createExitButtonElement();
        const rightSlot = shadowRoot.querySelector?.('.okami-slot-right');
        if (rightSlot) {
          rightSlot.appendChild(exitBtn);
        } else {
          shadowRoot.appendChild(exitBtn);
        }
      }
    } else {
      if (exitBtn && exitBtn.parentNode) {
        exitBtn.parentNode.removeChild(exitBtn);
      }
    }
  }

  /**
   * Atualiza o estado imersivo de todos os elementos na árvore do Shadow DOM.
   */
  function updateHUDImmersiveStateInShadow(shadowRoot, isImmersive) {
    if (!shadowRoot) return;

    const topBar =
      typeof shadowRoot.getElementById === 'function'
        ? shadowRoot.getElementById(OKAMI_HUD_TOP_BAR_ID)
        : shadowRoot.querySelector?.(`#${OKAMI_HUD_TOP_BAR_ID}`);

    const trigger =
      typeof shadowRoot.getElementById === 'function'
        ? shadowRoot.getElementById(OKAMI_HUD_TRIGGER_ZONE_ID)
        : shadowRoot.querySelector?.(`#${OKAMI_HUD_TRIGGER_ZONE_ID}`);

    if (topBar && trigger) {
      if (isImmersive) {
        topBar.classList.add('immersive-active');
        trigger.classList.add('immersive-active');
      } else {
        topBar.classList.remove('immersive-active');
        topBar.classList.remove('visible');
        trigger.classList.remove('immersive-active');
      }
    }

    updateExitButtonInShadow(shadowRoot, isImmersive);
  }

  /**
   * Apresenta um toast informativo temporário e discreto dentro do Shadow DOM.
   */
  function showToastFeedback(shadowRoot, message, durationMs = 2600) {
    if (!shadowRoot) return;

    let existingToast =
      typeof shadowRoot.getElementById === 'function'
        ? shadowRoot.getElementById(OKAMI_HUD_TOAST_ID)
        : shadowRoot.querySelector?.(`#${OKAMI_HUD_TOAST_ID}`);

    if (existingToast && existingToast.parentNode) {
      existingToast.parentNode.removeChild(existingToast);
    }

    const toast = document.createElement('div');
    toast.id = OKAMI_HUD_TOAST_ID;
    toast.className = 'okami-toast-feedback';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const icon = document.createElement('span');
    icon.className = 'okami-toast-icon';
    icon.textContent = '◈';
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'okami-toast-text';
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    shadowRoot.appendChild(toast);

    // Animação de entrada
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 350);
    }, durationMs);
  }

  /**
   * Controlador e orquestrador de eventos da barra superior no Shadow DOM.
   */
  function setupHUDController(shadowRoot, topBar, triggerZone, initialImmersive = false) {
    let isImmersive = Boolean(initialImmersive);
    let hideTimer = null;
    let initialRevealTimer = null;
    let isHoveringTopBar = false;
    let isHoveringTrigger = false;

    // Controlador da Barra de Endereço
    const addressBarElem = topBar.querySelector(`#${OKAMI_HUD_ADDRESS_BAR_ID}`);
    const addressInputElem = topBar.querySelector(`#${OKAMI_HUD_ADDRESS_INPUT_ID}`);
    const addressClearBtn = topBar.querySelector(`#${OKAMI_HUD_ADDRESS_CLEAR_ID}`);
    const addressStatusElem = topBar.querySelector(`#${OKAMI_HUD_ADDRESS_STATUS_ID}`);

    let lastCommittedUrl = '';
    let isAddressInputFocused = false;

    function isAddressInputActive() {
      if (!addressInputElem) return false;
      if (isAddressInputFocused) return true;
      const docActive = typeof document !== 'undefined' ? document.activeElement : null;
      const shadowActive = shadowRoot ? shadowRoot.activeElement : null;
      return docActive === addressInputElem || shadowActive === addressInputElem;
    }

    function showTopBar() {
      if (!isImmersive) return;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (initialRevealTimer) {
        clearTimeout(initialRevealTimer);
        initialRevealTimer = null;
      }
      topBar.classList.add('visible');
    }

    function toggleTopBar() {
      if (!isImmersive) {
        // Feedback visual discreto informando que o HUD está disponível no modo imersivo
        showToastFeedback(
          shadowRoot,
          'Okami HUD disponível no modo imersivo (Alt+Shift+F)'
        );
        return;
      }

      if (topBar.classList.contains('visible')) {
        // Se estiver com foco na barra de endereço, fecha o foco e a barra
        if (isAddressInputActive()) {
          addressInputElem.blur();
        }
        hideTopBarImmediately();
      } else {
        showTopBar();
      }
    }

    function scheduleHideTopBar(delay = HUD_AUTOHIDE_DELAY_MS) {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      hideTimer = setTimeout(() => {
        // Não recolhe se o usuário estiver com foco no campo de endereço digitando
        if (!isHoveringTopBar && !isHoveringTrigger && !isAddressInputActive()) {
          topBar.classList.remove('visible');
        }
        hideTimer = null;
      }, delay);
    }

    function flashTopBar(duration = HUD_INITIAL_REVEAL_DURATION_MS) {
      if (!isImmersive) return;
      showTopBar();
      if (initialRevealTimer) {
        clearTimeout(initialRevealTimer);
      }
      initialRevealTimer = setTimeout(() => {
        if (!isHoveringTopBar && !isHoveringTrigger && !isAddressInputActive()) {
          scheduleHideTopBar(HUD_AUTOHIDE_DELAY_MS);
        }
        initialRevealTimer = null;
      }, duration);
    }

    function hideTopBarImmediately() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      topBar.classList.remove('visible');
    }

    // Interações na zona de disparo superior
    triggerZone.addEventListener('mouseenter', () => {
      isHoveringTrigger = true;
      showTopBar();
    });

    triggerZone.addEventListener('mouseleave', () => {
      isHoveringTrigger = false;
      scheduleHideTopBar();
    });

    // Interações na barra superior (mantém aberta durante o uso)
    topBar.addEventListener('mouseenter', () => {
      isHoveringTopBar = true;
      showTopBar();
    });

    topBar.addEventListener('mouseleave', () => {
      isHoveringTopBar = false;
      scheduleHideTopBar();
    });

    // Mantém acessível via teclado dentro do Shadow DOM
    topBar.addEventListener('focusin', () => {
      showTopBar();
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    });

    topBar.addEventListener('focusout', (e) => {
      if (!topBar.contains(e.relatedTarget)) {
        scheduleHideTopBar();
      }
    });

    function updateClearButtonVisibility() {
      if (addressClearBtn && addressInputElem) {
        if (addressInputElem.value && addressInputElem.value.length > 0) {
          addressClearBtn.classList.add('visible');
        } else {
          addressClearBtn.classList.remove('visible');
        }
      }
    }

    function setAddressStatus(status, message = null) {
      if (!addressBarElem) return;

      addressBarElem.classList.remove(
        'status-idle',
        'status-focused',
        'status-loading',
        'status-success',
        'status-error'
      );
      addressBarElem.classList.add(`status-${status}`);

      if (addressStatusElem) {
        if (status === 'loading') {
          addressStatusElem.textContent = '◌';
          addressStatusElem.classList.add('spinning');
        } else {
          addressStatusElem.classList.remove('spinning');
          if (status === 'error') {
            addressStatusElem.textContent = '⚠';
          } else if (status === 'success') {
            addressStatusElem.textContent = '✓';
          } else {
            const val = addressInputElem ? addressInputElem.value : '';
            if (val.startsWith('https://')) {
              addressStatusElem.textContent = '🔒';
            } else if (val.startsWith('http://')) {
              addressStatusElem.textContent = '🔓';
            } else {
              addressStatusElem.textContent = '🔍';
            }
          }
        }
      }

      if (message) {
        showToastFeedback(shadowRoot, message, 3000);
      }
    }

    function setAddressValue(url) {
      lastCommittedUrl = typeof url === 'string' ? url : '';
      if (addressInputElem && !isAddressInputActive()) {
        addressInputElem.value = lastCommittedUrl;
        updateClearButtonVisibility();
        setAddressStatus('idle');
      }
    }

    function getAddressValue() {
      return addressInputElem ? addressInputElem.value : '';
    }

    if (addressInputElem) {
      addressInputElem.addEventListener('focus', () => {
        isAddressInputFocused = true;
        showTopBar();
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
        setAddressStatus('focused');
        updateClearButtonVisibility();
        // Seleciona automaticamente o conteúdo ao focar para facilitar substituição
        setTimeout(() => {
          try {
            addressInputElem.select();
          } catch (_e) {
            // Suporte parcial
          }
        }, 0);
      });

      addressInputElem.addEventListener('blur', () => {
        isAddressInputFocused = false;
        if (!addressInputElem.value) {
          addressInputElem.value = lastCommittedUrl;
        }
        setAddressStatus('idle');
        updateClearButtonVisibility();
        scheduleHideTopBar();
      });

      addressInputElem.addEventListener('input', () => {
        updateClearButtonVisibility();
      });

      addressInputElem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const rawQuery = addressInputElem.value;
          if (typeof globalScope.requestNavigation === 'function') {
            globalScope.requestNavigation(rawQuery);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          addressInputElem.value = lastCommittedUrl;
          addressInputElem.blur();
          scheduleHideTopBar();
        }
      });
    }

    if (addressClearBtn && addressInputElem) {
      addressClearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addressInputElem.value = '';
        updateClearButtonVisibility();
        addressInputElem.focus();
      });
    }

    /**
     * Trata movimentos do cursor na viewport.
     * Suporta tanto PointerEvent quanto MouseEvent de forma unificada e confiável.
     * Utiliza coordenadas da viewport (clientY) e ativa a barra imediatamente em clientY <= 8.
     * Quando o cursor se afasta para clientY > 48 (fora da barra e trigger), agenda recolhimento.
     */
    let isEdgeTrackingAttached = false;

    function handleGlobalPointerMove(e) {
      if (!isImmersive) return;

      const clientY = typeof e.clientY === 'number' ? e.clientY : -1;
      if (clientY >= 0 && clientY <= 8) {
        showTopBar();
      } else if (clientY > 48 && !isHoveringTopBar && !isHoveringTrigger && !isAddressInputActive()) {
        if (topBar.classList.contains('visible') && !hideTimer) {
          scheduleHideTopBar();
        }
      }
    }

    function attachEdgeTracking() {
      if (isEdgeTrackingAttached) return;

      const target = typeof window !== 'undefined' ? window : null;
      if (target && typeof target.addEventListener === 'function') {
        if ('PointerEvent' in target || typeof globalScope.PointerEvent !== 'undefined') {
          target.addEventListener('pointermove', handleGlobalPointerMove, {
            passive: true,
            capture: true,
          });
        }
        target.addEventListener('mousemove', handleGlobalPointerMove, {
          passive: true,
          capture: true,
        });
      }

      isEdgeTrackingAttached = true;
    }

    function detachEdgeTracking() {
      if (!isEdgeTrackingAttached) return;

      const target = typeof window !== 'undefined' ? window : null;
      if (target && typeof target.removeEventListener === 'function') {
        if ('PointerEvent' in target || typeof globalScope.PointerEvent !== 'undefined') {
          target.removeEventListener('pointermove', handleGlobalPointerMove, {
            capture: true,
          });
        }
        target.removeEventListener('mousemove', handleGlobalPointerMove, {
          capture: true,
        });
      }

      isEdgeTrackingAttached = false;
    }

    function setImmersiveState(active, options = {}) {
      const wasImmersive = isImmersive;
      isImmersive = Boolean(active);
      const shouldFlash = typeof options === 'boolean' ? options : (options?.flash ?? false);

      if (isImmersive) {
        attachEdgeTracking();
        if (!wasImmersive && shouldFlash) {
          flashTopBar(HUD_INITIAL_REVEAL_DURATION_MS);
        } else if (!wasImmersive) {
          hideTopBarImmediately();
        }
      } else {
        detachEdgeTracking();
        hideTopBarImmediately();
        isHoveringTopBar = false;
        isHoveringTrigger = false;
        if (initialRevealTimer) {
          clearTimeout(initialRevealTimer);
          initialRevealTimer = null;
        }
      }
      updateHUDImmersiveStateInShadow(shadowRoot, isImmersive);
    }

    // Aplica o estado inicial
    setImmersiveState(isImmersive);

    return {
      showTopBar,
      toggleTopBar,
      flashTopBar,
      scheduleHideTopBar,
      hideTopBarImmediately,
      setImmersiveState,
      handleGlobalPointerMove,
      isTopBarVisible: () => topBar.classList.contains('visible'),
      setAddressValue,
      getAddressValue,
      setAddressStatus,
      getAddressInput: () => addressInputElem,
      getAddressBar: () => addressBarElem,
      get isImmersive() {
        return isImmersive;
      },
      destroy() {
        detachEdgeTracking();
        hideTopBarImmediately();
        if (initialRevealTimer) {
          clearTimeout(initialRevealTimer);
          initialRevealTimer = null;
        }
      },
    };
  }

  /**
   * Renderiza os estilos isolados, a zona de ativação por borda, a barra superior e o badge inicial
   * dentro do Shadow DOM fechado fornecido.
   */
  function renderOkamiHUDInShadow(shadowRoot, options = {}) {
    // Limpeza segura sem innerHTML com dados de terceiros
    while (shadowRoot.firstChild) {
      shadowRoot.removeChild(shadowRoot.firstChild);
    }

    const style = document.createElement('style');
    style.textContent = `
    :host {
      all: initial;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 2147483647; /* Nível máximo e seguro de isolamento visual */
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    *, *::before, *::after {
      box-sizing: inherit;
    }

    /* Zona sensora no topo da tela para captura de aproximação do mouse */
    .okami-top-trigger {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 8px;
      pointer-events: none;
      z-index: 2147483646;
      background: transparent;
    }

    .okami-top-trigger.immersive-active {
      pointer-events: auto; /* Torna a borda sensível exclusivamente durante o modo imersivo */
    }

    /* Barra Superior de Navegação Okami HUD */
    .okami-top-bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 48px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;

      /* Identidade Visual Okami: translúcida, minimalista e moderna */
      background: rgba(13, 14, 18, 0.82);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2);

      color: #f3f4f8;
      pointer-events: none; /* Desabilitado enquanto oculto */
      user-select: none;

      /* Animação suave e fluida de transição (slide + fade) */
      transform: translateY(-100%);
      opacity: 0;
      visibility: hidden;
      transition:
        transform 0.26s cubic-bezier(0.16, 1, 0.3, 1),
        opacity 0.22s ease-out,
        visibility 0.26s;
    }

    /* Estado visível da barra superior */
    .okami-top-bar.immersive-active.visible {
      transform: translateY(0);
      opacity: 1;
      visibility: visible;
      pointer-events: auto; /* Habilita interação exclusiva na barra */
    }

    /* Seções estruturais da barra */
    .okami-bar-section {
      display: flex;
      align-items: center;
      height: 100%;
    }

    /* Região Esquerda: Identidade Visual Okami */
    .okami-section-left {
      flex: 0 0 auto;
      gap: 12px;
    }

    .okami-brand {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: default;
      font-weight: 700;
      letter-spacing: 0.8px;
    }

    .okami-brand-icon {
      font-size: 15px;
      color: #ff3344; /* Vermelho carmesim característico Okami */
      filter: drop-shadow(0 0 6px rgba(255, 51, 68, 0.6));
      line-height: 1;
    }

    .okami-brand-name {
      font-size: 13px;
      font-weight: 700;
      color: #f7f7fa;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }

    .okami-brand-badge {
      font-size: 9px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #b0b4c3;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .okami-slot-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Região Central: Barra de Endereço e Navegação Funcional */
    .okami-section-center {
      flex: 1 1 auto;
      justify-content: center;
      min-width: 0;
      max-width: 640px;
      margin: 0 auto;
    }

    .okami-address-bar {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      height: 32px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.10);
      padding: 0 10px;
      gap: 8px;
      transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .okami-address-bar:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.18);
    }

    .okami-address-bar.status-focused {
      background: rgba(20, 22, 28, 0.95);
      border-color: rgba(255, 51, 68, 0.65);
      box-shadow: 0 0 0 2px rgba(255, 51, 68, 0.25), 0 4px 16px rgba(0, 0, 0, 0.35);
    }

    .okami-address-bar.status-loading {
      border-color: rgba(64, 150, 255, 0.65);
      box-shadow: 0 0 0 2px rgba(64, 150, 255, 0.2);
    }

    .okami-address-bar.status-success {
      border-color: rgba(46, 204, 113, 0.65);
      box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.2);
    }

    .okami-address-bar.status-error {
      border-color: rgba(255, 51, 68, 0.85);
      box-shadow: 0 0 0 2px rgba(255, 51, 68, 0.35);
    }

    .okami-address-icon {
      flex: 0 0 auto;
      font-size: 13px;
      line-height: 1;
      opacity: 0.75;
      user-select: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
    }

    .okami-address-icon.spinning {
      display: inline-block;
      animation: okami-spin 0.85s linear infinite;
      color: #4096ff;
    }

    @keyframes okami-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .okami-address-input {
      flex: 1 1 auto;
      min-width: 0;
      height: 100%;
      background: transparent;
      border: none;
      outline: none;
      color: #f7f7fa;
      font-size: 13px;
      letter-spacing: 0.2px;
      padding: 0 2px;
      font-family: inherit;
    }

    .okami-address-input::placeholder {
      color: rgba(255, 255, 255, 0.36);
      font-weight: 400;
    }

    .okami-address-clear-btn {
      flex: 0 0 auto;
      display: none;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.12);
      color: #f0f0f5;
      font-size: 10px;
      line-height: 1;
      cursor: pointer;
      outline: none;
      padding: 0;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .okami-address-clear-btn:hover {
      background: rgba(255, 51, 68, 0.45);
      color: #ffffff;
    }

    .okami-address-clear-btn.visible {
      display: inline-flex;
    }

    /* Região Direita: Controles e Botão de Saída */
    .okami-section-right {
      flex: 0 0 auto;
      gap: 10px;
    }

    .okami-slot-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .okami-exit-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.07);
      color: #f1f2f6;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.14);
      cursor: pointer;
      user-select: none;
      outline: none;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .okami-exit-btn:hover {
      background: rgba(255, 51, 68, 0.18);
      border-color: rgba(255, 51, 68, 0.45);
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(255, 51, 68, 0.25);
    }

    .okami-exit-btn:focus-visible {
      border-color: #ff3344;
      box-shadow: 0 0 0 2px rgba(255, 51, 68, 0.4);
    }

    .okami-exit-btn:active {
      transform: translateY(0);
      background: rgba(255, 51, 68, 0.28);
    }

    .okami-exit-icon {
      font-size: 11px;
      line-height: 1;
      opacity: 0.85;
    }

    .okami-exit-text {
      line-height: 1;
      letter-spacing: 0.2px;
    }

    /* Badge sutil de inicialização (desaparece após 3.5s) */
    .okami-init-badge {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(18, 18, 22, 0.85);
      color: #f0f0f5;
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      letter-spacing: 0.5px;
      pointer-events: none;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      opacity: 0.9;
      transition: opacity 0.5s ease-out;
      user-select: none;
    }

    /* Toast de feedback temporário (ex: Alt+Shift+H fora do modo imersivo) */
    .okami-toast-feedback {
      position: absolute;
      top: 18px;
      left: 50%;
      transform: translateX(-50%) translateY(-16px);
      background: rgba(15, 16, 21, 0.92);
      color: #f0f1f6;
      border: 1px solid rgba(255, 255, 255, 0.14);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.4px;
      pointer-events: none;
      backdrop-filter: blur(16px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2);
      opacity: 0;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      z-index: 2147483647;
      user-select: none;
    }

    .okami-toast-feedback.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    .okami-toast-icon {
      color: #ff3344;
      font-size: 13px;
      line-height: 1;
    }

    .okami-toast-text {
      line-height: 1;
    }
  `;

    const triggerZone = createTriggerZoneElement();
    const topBar = createTopBarElement();

    const badge = document.createElement('div');
    badge.id = OKAMI_HUD_INDICATOR_ID;
    badge.className = 'okami-init-badge';
    badge.textContent = 'Okami HUD Ready';

    shadowRoot.appendChild(style);
    shadowRoot.appendChild(triggerZone);
    shadowRoot.appendChild(topBar);
    shadowRoot.appendChild(badge);

    const controller = setupHUDController(
      shadowRoot,
      topBar,
      triggerZone,
      Boolean(options.isImmersive)
    );

    // O indicador mínimo desaparece suavemente após 3.5 segundos para não poluir a interface
    setTimeout(() => {
      badge.style.opacity = '0';
      setTimeout(() => {
        if (badge.parentNode) {
          badge.parentNode.removeChild(badge);
        }
      }, 600);
    }, 3500);

    return controller;
  }

  /**
   * Registra o Custom Element se o ambiente suportar e se ainda não estiver registrado.
   * Retorna true se registrado com sucesso ou se já estava registrado, false caso customElements não esteja disponível.
   */
  function registerOkamiHUDRoot() {
    if (
      typeof customElements !== 'undefined' &&
      customElements !== null &&
      typeof customElements.get === 'function' &&
      typeof customElements.define === 'function'
    ) {
      if (!customElements.get(OKAMI_HUD_CUSTOM_ELEMENT)) {
        customElements.define(OKAMI_HUD_CUSTOM_ELEMENT, OkamiHUDRoot);
      }
      return true;
    }
    return false;
  }

  // Exportação no escopo compartilhado (compatível com Content Scripts do Chrome e testes)
  globalScope.OkamiHUDRoot = OkamiHUDRoot;
  globalScope.renderOkamiHUDInShadow = renderOkamiHUDInShadow;
  globalScope.updateExitButtonInShadow = updateExitButtonInShadow;
  globalScope.updateHUDImmersiveStateInShadow = updateHUDImmersiveStateInShadow;
  globalScope.registerOkamiHUDRoot = registerOkamiHUDRoot;
  globalScope.createExitButtonElement = createExitButtonElement;
  globalScope.createTopBarElement = createTopBarElement;
  globalScope.createAddressBarElement = createAddressBarElement;
  globalScope.createTriggerZoneElement = createTriggerZoneElement;
  globalScope.setupHUDController = setupHUDController;
  globalScope.CONTROLLER_REGISTRY_SYMBOL = CONTROLLER_REGISTRY_SYMBOL;
  globalScope.SHADOW_ROOT_REGISTRY_SYMBOL = SHADOW_ROOT_REGISTRY_SYMBOL;
  globalScope.OKAMI_HUD_CUSTOM_ELEMENT = OKAMI_HUD_CUSTOM_ELEMENT;
  globalScope.OKAMI_HUD_INDICATOR_ID = OKAMI_HUD_INDICATOR_ID;
  globalScope.OKAMI_HUD_TOP_BAR_ID = OKAMI_HUD_TOP_BAR_ID;
  globalScope.OKAMI_HUD_TRIGGER_ZONE_ID = OKAMI_HUD_TRIGGER_ZONE_ID;
  globalScope.OKAMI_HUD_ADDRESS_BAR_ID = OKAMI_HUD_ADDRESS_BAR_ID;
  globalScope.OKAMI_HUD_ADDRESS_INPUT_ID = OKAMI_HUD_ADDRESS_INPUT_ID;
  globalScope.OKAMI_HUD_ADDRESS_CLEAR_ID = OKAMI_HUD_ADDRESS_CLEAR_ID;
  globalScope.OKAMI_HUD_ADDRESS_STATUS_ID = OKAMI_HUD_ADDRESS_STATUS_ID;
  globalScope.OKAMI_HUD_EXIT_BUTTON_ID = OKAMI_HUD_EXIT_BUTTON_ID;
  globalScope.OKAMI_HUD_TOAST_ID = OKAMI_HUD_TOAST_ID;
  globalScope.HUD_AUTOHIDE_DELAY_MS = HUD_AUTOHIDE_DELAY_MS;
  globalScope.HUD_INITIAL_REVEAL_DURATION_MS = HUD_INITIAL_REVEAL_DURATION_MS;
  globalScope.showToastFeedback = showToastFeedback;
})(typeof globalThis !== 'undefined' ? globalThis : window);
