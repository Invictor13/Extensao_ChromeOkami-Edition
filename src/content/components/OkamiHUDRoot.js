/**
 * Custom Element raiz do Okami HUD.
 * Utiliza Shadow DOM fechado (`mode: 'closed'`) para isolar completamente seus estilos
 * e DOM da página hospedeira.
 */
(function (globalScope) {
  const OKAMI_HUD_CUSTOM_ELEMENT = 'okami-hud-root';
  const OKAMI_HUD_INDICATOR_ID = 'okami-hud-init-indicator';
  const OKAMI_HUD_EXIT_BUTTON_ID = 'okami-hud-exit-btn';

  class OkamiHUDRoot extends HTMLElement {
    constructor() {
      super();
      // Shadow DOM fechado conforme decisão de arquitetura
      this._shadowRoot = this.attachShadow({ mode: 'closed' });
      this._isImmersive = false;
    }

    connectedCallback() {
      this.render();
    }

    render() {
      renderOkamiHUDInShadow(this._shadowRoot, { isImmersive: this._isImmersive });
    }

    setImmersiveState(isImmersive) {
      this._isImmersive = Boolean(isImmersive);
      updateExitButtonInShadow(this._shadowRoot, this._isImmersive);
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
      return (
        (typeof this._shadowRoot.getElementById === 'function'
          ? this._shadowRoot.getElementById(OKAMI_HUD_EXIT_BUTTON_ID)
          : this._shadowRoot.querySelector(`#${OKAMI_HUD_EXIT_BUTTON_ID}`)) !== null
      );
    }
  }

  /**
   * Adiciona ou remove o botão de saída do modo imersivo dentro do Shadow Root.
   */
  function updateExitButtonInShadow(shadowRoot, isImmersive) {
    if (!shadowRoot) return;

    let exitBtn =
      typeof shadowRoot.getElementById === 'function'
        ? shadowRoot.getElementById(OKAMI_HUD_EXIT_BUTTON_ID)
        : shadowRoot.querySelector?.(`#${OKAMI_HUD_EXIT_BUTTON_ID}`);

    if (isImmersive) {
      if (!exitBtn) {
        exitBtn = document.createElement('button');
        exitBtn.id = OKAMI_HUD_EXIT_BUTTON_ID;
        exitBtn.className = 'okami-exit-btn';
        exitBtn.type = 'button';
        exitBtn.title = 'Sair do Modo Imersivo';
        exitBtn.setAttribute('aria-label', 'Sair do Modo Imersivo');

        const iconSpan = document.createElement('span');
        iconSpan.className = 'okami-exit-icon';
        iconSpan.textContent = '✕';

        const textSpan = document.createElement('span');
        textSpan.className = 'okami-exit-text';
        textSpan.textContent = 'Sair do Modo Imersivo';

        exitBtn.appendChild(iconSpan);
        exitBtn.appendChild(textSpan);

        exitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof globalScope.requestExitImmersiveMode === 'function') {
            globalScope.requestExitImmersiveMode();
          }
        });

        shadowRoot.appendChild(exitBtn);
      }
    } else {
      if (exitBtn && exitBtn.parentNode) {
        exitBtn.parentNode.removeChild(exitBtn);
      }
    }
  }

  /**
   * Renderiza os estilos isolados, o badge inicial e opcionalmente o botão de saída dentro do Shadow DOM fechado fornecido.
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
      z-index: 2147483647; /* Máximo z-index seguro */
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

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

    .okami-exit-btn {
      position: absolute;
      top: 14px;
      right: 18px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      background: rgba(22, 22, 28, 0.88);
      color: #ffffff;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      cursor: pointer;
      pointer-events: auto; /* Permite clique sem bloquear o restante da tela */
      user-select: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .okami-exit-btn:hover {
      background: rgba(40, 40, 52, 0.95);
      border-color: rgba(255, 255, 255, 0.35);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
    }

    .okami-exit-btn:active {
      transform: translateY(0);
      background: rgba(20, 20, 26, 0.95);
    }

    .okami-exit-icon {
      font-size: 13px;
      line-height: 1;
    }

    .okami-exit-text {
      line-height: 1;
    }
  `;

    const badge = document.createElement('div');
    badge.id = OKAMI_HUD_INDICATOR_ID;
    badge.className = 'okami-init-badge';
    badge.textContent = 'Okami HUD Ready';

    shadowRoot.appendChild(style);
    shadowRoot.appendChild(badge);

    if (options.isImmersive) {
      updateExitButtonInShadow(shadowRoot, true);
    }

    // O indicador mínimo desaparece suavemente após 3.5 segundos para não poluir a interface
    setTimeout(() => {
      badge.style.opacity = '0';
      setTimeout(() => {
        if (badge.parentNode) {
          badge.parentNode.removeChild(badge);
        }
      }, 600);
    }, 3500);
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
  globalScope.registerOkamiHUDRoot = registerOkamiHUDRoot;
  globalScope.OKAMI_HUD_CUSTOM_ELEMENT = OKAMI_HUD_CUSTOM_ELEMENT;
  globalScope.OKAMI_HUD_INDICATOR_ID = OKAMI_HUD_INDICATOR_ID;
  globalScope.OKAMI_HUD_EXIT_BUTTON_ID = OKAMI_HUD_EXIT_BUTTON_ID;
})(typeof globalThis !== 'undefined' ? globalThis : window);
