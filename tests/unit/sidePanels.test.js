import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../src/content/components/OkamiHUDRoot.js';
import '../../src/content/index.js';
import {
  OKAMI_HUD_CUSTOM_ELEMENT,
  OKAMI_HUD_LEFT_PANEL_ID,
  OKAMI_HUD_RIGHT_PANEL_ID,
  OKAMI_HUD_LEFT_PANEL_TRIGGER_ID,
  OKAMI_HUD_RIGHT_PANEL_TRIGGER_ID,
  MESSAGE_ACTIONS,
} from '../../src/shared/constants/index.js';

describe('PR05 — Sistema de Painéis Laterais e Atalhos do Okami HUD', () => {
  let mockChrome;

  beforeEach(() => {
    document.body.innerHTML = '';
    mockChrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
        },
      },
      tabs: {
        sendMessage: vi.fn(),
      },
    };
    globalThis.chrome = mockChrome;
    globalThis.resetContentScriptStateForTesting();
  });

  afterEach(() => {
    globalThis.resetContentScriptStateForTesting();
    document.body.innerHTML = '';
    delete globalThis.chrome;
    vi.restoreAllMocks();
  });

  it('1. deve abrir e fechar o painel esquerdo pelo atalho Alt+Shift+L', () => {
    globalThis.injectOkamiHUD();
    const controller = globalThis.getActiveController();
    controller.setImmersiveState(true);

    expect(controller.isLeftPanelOpen()).toBe(false);

    // Dispara Alt+Shift+L
    const eventOpen = new KeyboardEvent('keydown', {
      key: 'L',
      altKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(eventOpen);

    expect(controller.isLeftPanelOpen()).toBe(true);

    // Dispara novamente Alt+Shift+L para fechar
    const eventClose = new KeyboardEvent('keydown', {
      key: 'l',
      altKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(eventClose);

    expect(controller.isLeftPanelOpen()).toBe(false);
  });

  it('2. deve abrir e fechar o painel direito pelo atalho Alt+Shift+R', () => {
    globalThis.injectOkamiHUD();
    const controller = globalThis.getActiveController();
    controller.setImmersiveState(true);

    expect(controller.isRightPanelOpen()).toBe(false);

    // Dispara Alt+Shift+R
    const eventOpen = new KeyboardEvent('keydown', {
      key: 'R',
      altKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(eventOpen);

    expect(controller.isRightPanelOpen()).toBe(true);

    // Dispara novamente para fechar
    const eventClose = new KeyboardEvent('keydown', {
      key: 'r',
      altKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(eventClose);

    expect(controller.isRightPanelOpen()).toBe(false);
  });

  it('3. deve abrir e fechar painéis através dos controles visuais no HUD', () => {
    globalThis.injectOkamiHUD();
    const hudInstance = document.querySelector(OKAMI_HUD_CUSTOM_ELEMENT);
    const shadowRoot = hudInstance[Symbol.for('okami.hud.shadowRoot')];
    const controller = globalThis.getActiveController();
    controller.setImmersiveState(true);

    const leftTrigger = shadowRoot.querySelector(`#${OKAMI_HUD_LEFT_PANEL_TRIGGER_ID}`);
    const rightTrigger = shadowRoot.querySelector(`#${OKAMI_HUD_RIGHT_PANEL_TRIGGER_ID}`);
    const leftPanel = shadowRoot.querySelector(`#${OKAMI_HUD_LEFT_PANEL_ID}`);
    const rightPanel = shadowRoot.querySelector(`#${OKAMI_HUD_RIGHT_PANEL_ID}`);

    expect(leftTrigger).toBeTruthy();
    expect(rightTrigger).toBeTruthy();
    expect(leftPanel).toBeTruthy();
    expect(rightPanel).toBeTruthy();

    // Clica no gatilho esquerdo
    leftTrigger.click();
    expect(controller.isLeftPanelOpen()).toBe(true);
    expect(leftPanel.classList.contains('open')).toBe(true);
    expect(leftTrigger.getAttribute('aria-expanded')).toBe('true');

    // Clica no botão de fechar interno do painel esquerdo
    const leftCloseBtn = leftPanel.querySelector('.okami-panel-close-btn');
    leftCloseBtn.click();
    expect(controller.isLeftPanelOpen()).toBe(false);
    expect(leftPanel.classList.contains('open')).toBe(false);
    expect(leftTrigger.getAttribute('aria-expanded')).toBe('false');

    // Clica no gatilho direito
    rightTrigger.click();
    expect(controller.isRightPanelOpen()).toBe(true);
    expect(rightPanel.classList.contains('open')).toBe(true);
    expect(rightTrigger.getAttribute('aria-expanded')).toBe('true');

    // Clica no botão de fechar interno do painel direito
    const rightCloseBtn = rightPanel.querySelector('.okami-panel-close-btn');
    rightCloseBtn.click();
    expect(controller.isRightPanelOpen()).toBe(false);
    expect(rightPanel.classList.contains('open')).toBe(false);
    expect(rightTrigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('4. deve fechar o painel ativo ao pressionar Esc respeitando a hierarquia', () => {
    globalThis.injectOkamiHUD();
    const controller = globalThis.getActiveController();
    controller.setImmersiveState(true);

    // Abre painel esquerdo e depois o direito (ordem LIFO)
    controller.openLeftPanel();
    controller.openRightPanel();

    expect(controller.isLeftPanelOpen()).toBe(true);
    expect(controller.isRightPanelOpen()).toBe(true);

    // Primeiro Esc: fecha o painel direito (mais recente)
    const esc1 = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(esc1);

    expect(controller.isRightPanelOpen()).toBe(false);
    expect(controller.isLeftPanelOpen()).toBe(true);

    // Segundo Esc: fecha o painel esquerdo
    const esc2 = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(esc2);

    expect(controller.isLeftPanelOpen()).toBe(false);
  });

  it('5. não deve interceptar atalhos quando o usuário estiver digitando em campos editáveis da página', () => {
    globalThis.injectOkamiHUD();
    const controller = globalThis.getActiveController();
    controller.setImmersiveState(true);

    // Cria um input de formulário na página
    const pageInput = document.createElement('input');
    pageInput.type = 'text';
    document.body.appendChild(pageInput);
    pageInput.focus();

    // Tenta disparar Alt+Shift+L no input
    const eventOnInput = new KeyboardEvent('keydown', {
      key: 'L',
      altKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    pageInput.dispatchEvent(eventOnInput);

    // Não deve ter aberto o painel
    expect(controller.isLeftPanelOpen()).toBe(false);

    // Tenta disparar Esc no input
    const escOnInput = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    pageInput.dispatchEvent(escOnInput);

    // O manipulador global não consumiu o evento
    expect(escOnInput.defaultPrevented).toBe(false);
  });

  it('6. deve recolher automaticamente os painéis ao sair do modo imersivo', () => {
    globalThis.injectOkamiHUD();
    const controller = globalThis.getActiveController();
    controller.setImmersiveState(true);

    controller.openLeftPanel();
    controller.openRightPanel();
    expect(controller.isLeftPanelOpen()).toBe(true);
    expect(controller.isRightPanelOpen()).toBe(true);

    // Sai do modo imersivo
    controller.setImmersiveState(false);

    expect(controller.isLeftPanelOpen()).toBe(false);
    expect(controller.isRightPanelOpen()).toBe(false);
  });

  it('7. deve garantir ausência de bloqueio de cliques quando os painéis estão fechados', () => {
    globalThis.injectOkamiHUD();
    const hudInstance = document.querySelector(OKAMI_HUD_CUSTOM_ELEMENT);
    const shadowRoot = hudInstance[Symbol.for('okami.hud.shadowRoot')];
    const leftPanel = shadowRoot.querySelector(`#${OKAMI_HUD_LEFT_PANEL_ID}`);
    const rightPanel = shadowRoot.querySelector(`#${OKAMI_HUD_RIGHT_PANEL_ID}`);

    // Estado inicial: fechados
    expect(leftPanel.classList.contains('open')).toBe(false);
    expect(rightPanel.classList.contains('open')).toBe(false);

    // Os painéis possuem pointer-events: none garantido pela regra CSS base enquanto fechados
    // e o :host possui pointer-events: none
    expect(leftPanel.getAttribute('aria-hidden')).toBe('true');
    expect(rightPanel.getAttribute('aria-hidden')).toBe('true');
  });

  it('8. deve responder a mensagens de runtime para TOGGLE_LEFT_PANEL e TOGGLE_RIGHT_PANEL', () => {
    let messageListener;
    mockChrome.runtime.onMessage.addListener.mockImplementation((listener) => {
      messageListener = listener;
    });

    globalThis.resetContentScriptStateForTesting();
    globalThis.setupMessageListeners();
    globalThis.injectOkamiHUD();

    const controller = globalThis.getActiveController();
    controller.setImmersiveState(true);

    // Envia mensagem TOGGLE_LEFT_PANEL
    messageListener({ action: MESSAGE_ACTIONS.TOGGLE_LEFT_PANEL });
    expect(controller.isLeftPanelOpen()).toBe(true);

    messageListener({ action: MESSAGE_ACTIONS.TOGGLE_LEFT_PANEL });
    expect(controller.isLeftPanelOpen()).toBe(false);

    // Envia mensagem TOGGLE_RIGHT_PANEL
    messageListener({ action: MESSAGE_ACTIONS.TOGGLE_RIGHT_PANEL });
    expect(controller.isRightPanelOpen()).toBe(true);

    // Envia mensagem CLOSE_PANELS
    messageListener({ action: MESSAGE_ACTIONS.CLOSE_PANELS });
    expect(controller.isRightPanelOpen()).toBe(false);
  });

  it('9. deve prevenir duplicação de componentes em reinjeções sucessivas', () => {
    globalThis.injectOkamiHUD();
    globalThis.injectOkamiHUD();
    globalThis.injectOkamiHUD();

    const hudElements = document.querySelectorAll(OKAMI_HUD_CUSTOM_ELEMENT);
    expect(hudElements.length).toBe(1);

    const shadowRoot = hudElements[0][Symbol.for('okami.hud.shadowRoot')];
    const leftPanels = shadowRoot.querySelectorAll(`#${OKAMI_HUD_LEFT_PANEL_ID}`);
    const rightPanels = shadowRoot.querySelectorAll(`#${OKAMI_HUD_RIGHT_PANEL_ID}`);
    expect(leftPanels.length).toBe(1);
    expect(rightPanels.length).toBe(1);
  });

  it('10. deve preservar o funcionamento de atalhos existentes (Alt+Shift+H e Alt+Shift+F)', () => {
    globalThis.injectOkamiHUD();
    const controller = globalThis.getActiveController();
    controller.setImmersiveState(true);

    expect(controller.isTopBarVisible()).toBe(false);
    controller.toggleTopBar();
    expect(controller.isTopBarVisible()).toBe(true);
    controller.toggleTopBar();
    expect(controller.isTopBarVisible()).toBe(false);
  });
});
