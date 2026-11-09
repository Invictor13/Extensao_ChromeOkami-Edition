import { OKAMI_HUD_CUSTOM_ELEMENT, OKAMI_HUD_INDICATOR_ID } from '../../shared/constants';

/**
 * Custom Element raiz do Okami HUD.
 * Utiliza Shadow DOM fechado (`mode: 'closed'`) para isolar completamente seus estilos
 * e DOM da página hospedeira.
 */
export class OkamiHUDRoot extends HTMLElement {
  private _shadowRoot: ShadowRoot;

  constructor() {
    super();
    // Shadow DOM fechado conforme decisão de arquitetura
    this._shadowRoot = this.attachShadow({ mode: 'closed' });
  }

  connectedCallback(): void {
    this.render();
  }

  public render(): void {
    renderOkamiHUDInShadow(this._shadowRoot);
  }

  /**
   * Método auxiliar para testes unitários ou inspeção interna.
   */
  public hasRenderedBadge(): boolean {
    return this._shadowRoot.getElementById(OKAMI_HUD_INDICATOR_ID) !== null;
  }
}

/**
 * Renderiza os estilos isolados e o badge inicial dentro do Shadow DOM fechado fornecido.
 */
export function renderOkamiHUDInShadow(shadowRoot: ShadowRoot): void {
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
  `;

  const badge = document.createElement('div');
  badge.id = OKAMI_HUD_INDICATOR_ID;
  badge.className = 'okami-init-badge';
  badge.textContent = 'Okami HUD Ready';

  shadowRoot.appendChild(style);
  shadowRoot.appendChild(badge);

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
export function registerOkamiHUDRoot(): boolean {
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
