import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../src/content/components/OkamiHUDRoot.js';
import '../../src/content/index.js';
import {
  OKAMI_HUD_CUSTOM_ELEMENT,
  MESSAGE_ACTIONS,
} from '../../src/shared/constants/index.js';

describe('Content Script Ingestion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof globalThis.resetContentScriptStateForTesting === 'function') {
      globalThis.resetContentScriptStateForTesting();
    }
    document.body.innerHTML = '';
  });

  it('deve injetar o elemento raiz no DOM com sucesso', () => {
    const root = globalThis.injectOkamiHUD();
    expect(root).not.toBeNull();
    expect(document.querySelector(OKAMI_HUD_CUSTOM_ELEMENT)).toBe(root);
  });

  it('não deve reinjetar uma nova instância se já existir uma no DOM', () => {
    const firstInstance = globalThis.injectOkamiHUD();
    const secondInstance = globalThis.injectOkamiHUD();

    expect(firstInstance).toBe(secondInstance);
    expect(document.querySelectorAll(OKAMI_HUD_CUSTOM_ELEMENT).length).toBe(1);
  });

  it('deve injetar com sucesso quando o elemento raiz não for previamente promovido a OkamiHUDRoot', () => {
    const originalCustomElements = globalThis.customElements;
    globalThis.customElements = null;

    const dummyElement = document.createElement('header');
    const attachSpy = vi.spyOn(dummyElement, 'attachShadow');
    const originalCreateElement = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === OKAMI_HUD_CUSTOM_ELEMENT) {
        return dummyElement;
      }
      return originalCreateElement(tagName);
    });

    const root = globalThis.injectOkamiHUD();
    expect(root).toBe(dummyElement);
    expect(attachSpy).toHaveBeenCalledWith({ mode: 'closed' });

    createSpy.mockRestore();
    globalThis.customElements = originalCustomElements;
  });

  it('deve solicitar saída do modo imersivo via chrome.runtime.sendMessage', () => {
    const sendMessageSpy = vi.fn();
    globalThis.chrome = {
      runtime: {
        sendMessage: sendMessageSpy,
      },
    };

    globalThis.requestExitImmersiveMode();
    expect(sendMessageSpy).toHaveBeenCalledWith(
      { action: MESSAGE_ACTIONS.EXIT_IMMERSIVE },
      expect.any(Function)
    );
  });

  it('deve registrar listener para IMMERSIVE_STATE_CHANGED e atualizar o estado', () => {
    let capturedListener = null;
    globalThis.chrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn((cb) => {
            capturedListener = cb;
          }),
        },
      },
    };

    globalThis.setupMessageListeners();
    expect(globalThis.chrome.runtime.onMessage.addListener).toHaveBeenCalled();

    const root = globalThis.injectOkamiHUD();
    capturedListener({ action: MESSAGE_ACTIONS.IMMERSIVE_STATE_CHANGED, isImmersive: true });
    expect(root.hasExitButton()).toBe(true);

    capturedListener({ action: MESSAGE_ACTIONS.IMMERSIVE_STATE_CHANGED, isImmersive: false });
    expect(root.hasExitButton()).toBe(false);
  });

  it('deve consultar o estado inicial via GET_IMMERSIVE_STATE', () => {
    const sendMessageSpy = vi.fn((msg, cb) => {
      cb({ isImmersive: true });
    });
    globalThis.chrome = {
      runtime: {
        sendMessage: sendMessageSpy,
      },
    };

    const root = globalThis.injectOkamiHUD();
    globalThis.queryInitialState();

    expect(sendMessageSpy).toHaveBeenCalledWith(
      { action: MESSAGE_ACTIONS.GET_IMMERSIVE_STATE },
      expect.any(Function)
    );
    expect(root.hasExitButton()).toBe(true);
  });

  it('deve alternar a visibilidade do HUD ao receber mensagem TOGGLE_HUD_VISIBILITY', () => {
    let capturedListener = null;
    globalThis.chrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn((cb) => {
            capturedListener = cb;
          }),
        },
      },
    };

    globalThis.setupMessageListeners();
    const root = globalThis.injectOkamiHUD();
    root.setImmersiveState(true);
    expect(root.isTopBarVisible()).toBe(false);

    // Envia mensagem TOGGLE_HUD_VISIBILITY
    capturedListener({ action: MESSAGE_ACTIONS.TOGGLE_HUD_VISIBILITY });
    expect(root.isTopBarVisible()).toBe(true);

    // Envia mensagem novamente para fechar
    capturedListener({ action: MESSAGE_ACTIONS.TOGGLE_HUD_VISIBILITY });
    expect(root.isTopBarVisible()).toBe(false);
  });

  it('deve bufferizar estado imersivo recebido antes da injeção do elemento raiz e aplicá-lo ao injetar', () => {
    globalThis.applyImmersiveState(true);
    expect(globalThis.getPendingImmersiveState()).toBe(true);

    const root = globalThis.injectOkamiHUD();
    expect(root.hasExitButton()).toBe(true);
  });

  it('não deve registrar listeners duplicados ao chamar setupMessageListeners múltiplas vezes', () => {
    const addListenerSpy = vi.fn();
    globalThis.chrome = {
      runtime: {
        onMessage: {
          addListener: addListenerSpy,
        },
      },
    };

    globalThis.setupMessageListeners();
    expect(addListenerSpy).toHaveBeenCalledTimes(1);

    globalThis.setupMessageListeners();
    expect(addListenerSpy).toHaveBeenCalledTimes(1);
  });

  it('deve responder à mensagem OKAMI_PING com { status: "ok" }', () => {
    let capturedListener = null;
    globalThis.chrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn((cb) => {
            capturedListener = cb;
          }),
        },
      },
    };

    globalThis.setupMessageListeners();
    const sendResponseSpy = vi.fn();
    capturedListener({ action: MESSAGE_ACTIONS.PING }, {}, sendResponseSpy);

    expect(sendResponseSpy).toHaveBeenCalledWith({ status: 'ok', version: '0.1.0' });
  });
});
