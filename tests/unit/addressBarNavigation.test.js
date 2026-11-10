import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isAllowedProtocol,
  isLikelyUrl,
  resolveNavigationTarget,
  DEFAULT_SEARCH_ENGINE_URL,
} from '../../src/shared/utils/navigation.js';
import '../../src/content/components/OkamiHUDRoot.js';
import '../../src/content/index.js';
import {
  setupImmersiveModeManager,
} from '../../src/background/managers/ImmersiveModeManager.js';
import {
  OKAMI_HUD_CUSTOM_ELEMENT,
  OKAMI_HUD_ADDRESS_INPUT_ID,
  OKAMI_HUD_ADDRESS_BAR_ID,
  OKAMI_HUD_EXIT_BUTTON_ID,
  MESSAGE_ACTIONS,
} from '../../src/shared/constants/index.js';

describe('PR04.4 — Barra de Endereço e Navegação Funcional', () => {
  let messageListeners = [];
  let mockTabs = {};

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    messageListeners = [];
    mockTabs = {
      101: { id: 101, url: 'https://example.com/start', windowId: 1 },
    };

    globalThis.chrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn((fn) => messageListeners.push(fn)),
        },
        lastError: null,
      },
      tabs: {
        query: vi.fn(async () => [{ id: 101, windowId: 1, url: 'https://example.com/start' }]),
        get: vi.fn(async (id) => mockTabs[id]),
        update: vi.fn(async (id, updateInfo) => {
          if (mockTabs[id]) {
            mockTabs[id].url = updateInfo.url;
          }
          return mockTabs[id];
        }),
        sendMessage: vi.fn(async () => ({ status: 'ready', readiness: { controllerAvailable: true } })),
      },
      windows: {
        getCurrent: vi.fn(async () => ({ id: 1, state: 'normal' })),
        get: vi.fn(async (id) => ({ id, state: 'normal' })),
        update: vi.fn(async (id, updateInfo) => ({ id, state: updateInfo.state })),
      },
      storage: {
        session: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => {}),
        },
      },
    };

    if (globalThis.resetContentScriptStateForTesting) {
      globalThis.resetContentScriptStateForTesting();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1 & 2. Clique, foco, digitação e edição no campo de endereço', () => {
    it('deve aceitar foco, digitação e edição dentro do Shadow DOM fechado', () => {
      globalThis.registerOkamiHUDRoot();
      const element = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);
      document.body.appendChild(element);

      expect(element.hasAddressInput()).toBe(true);
      const input = element.getAddressInput();
      expect(input).not.toBeNull();

      input.focus();
      input.value = 'https://vitest.dev';
      input.dispatchEvent(new Event('input'));

      expect(element.getAddressValue()).toBe('https://vitest.dev');
    });

    it('deve suspender o fechamento automático da barra superior enquanto o campo estiver focado', () => {
      const dummyShadow = document.createElement('div');
      const controller = globalThis.renderOkamiHUDInShadow(dummyShadow, { isImmersive: true });
      const input = dummyShadow.querySelector(`#${OKAMI_HUD_ADDRESS_INPUT_ID}`);

      controller.showTopBar();
      expect(controller.isTopBarVisible()).toBe(true);

      // Simula foco no input
      input.focus();
      input.dispatchEvent(new Event('focus'));

      // Cursor se afasta da barra
      controller.scheduleHideTopBar(200);
      vi.advanceTimersByTime(300);

      // A barra deve permanecer aberta pois o usuário está com foco no input
      expect(controller.isTopBarVisible()).toBe(true);

      // Ao desfocar o input, a barra agora pode fechar
      input.blur();
      input.dispatchEvent(new Event('blur'));
      vi.advanceTimersByTime(450);
      expect(controller.isTopBarVisible()).toBe(false);

      controller.destroy();
    });
  });

  describe('3. Seleção automática do endereço ao receber foco', () => {
    it('deve invocar select() ao receber foco no campo de endereço', () => {
      const dummyShadow = document.createElement('div');
      globalThis.renderOkamiHUDInShadow(dummyShadow, { isImmersive: true });
      const input = dummyShadow.querySelector(`#${OKAMI_HUD_ADDRESS_INPUT_ID}`);
      const selectSpy = vi.spyOn(input, 'select');

      input.focus();
      input.dispatchEvent(new Event('focus'));
      vi.runAllTimers();

      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('4 & 5 & 6. Navegação por URL, normalização de domínio e pesquisa por texto', () => {
    it('deve resolver URLs válidas com protocolo HTTPS diretamente', () => {
      const res = resolveNavigationTarget('https://google.com');
      expect(res.type).toBe('url');
      expect(res.destinationUrl).toBe('https://google.com/');
    });

    it('deve normalizar domínios sem protocolo para HTTPS', () => {
      const res = resolveNavigationTarget('github.com');
      expect(res.type).toBe('url');
      expect(res.destinationUrl).toBe('https://github.com/');
    });

    it('deve tratar termos com múltiplos espaços como pesquisa no mecanismo padrão', () => {
      const res = resolveNavigationTarget('pesquisa de RPG medieval');
      expect(res.type).toBe('search');
      expect(res.destinationUrl).toBe(
        `${DEFAULT_SEARCH_ENGINE_URL}pesquisa%20de%20RPG%20medieval`
      );
    });

    it('deve identificar localhost e portas como URLs', () => {
      expect(isLikelyUrl('localhost:3000')).toBe(true);
      expect(isLikelyUrl('127.0.0.1:8080')).toBe(true);
      expect(isLikelyUrl('palavra isolada sem ponto')).toBe(false);

      const resLocal = resolveNavigationTarget('localhost:3000/dashboard');
      expect(resLocal.type).toBe('url');
      expect(resLocal.destinationUrl).toBe('https://localhost:3000/dashboard');
    });
  });

  describe('7. Campo vazio', () => {
    it('não deve executar navegação quando o campo estiver vazio ou com espaços em branco', () => {
      const resEmpty = resolveNavigationTarget('');
      expect(resEmpty.type).toBe('empty');
      expect(resEmpty.destinationUrl).toBeNull();

      const resWhitespace = resolveNavigationTarget('    ');
      expect(resWhitespace.type).toBe('empty');
      expect(resWhitespace.destinationUrl).toBeNull();
    });
  });

  describe('8. Rejeição de protocolos perigosos', () => {
    it('deve rejeitar javascript:, data:, file:, chrome: e protocolos não autorizados', () => {
      const dangerousList = [
        'javascript:alert(1)',
        'data:text/html,<h1>Hack</h1>',
        'file:///etc/passwd',
        'chrome://extensions',
        'about:blank',
        'blob:https://example.com/123',
      ];

      for (const dangerous of dangerousList) {
        const res = resolveNavigationTarget(dangerous);
        expect(res.type).toBe('blocked');
        expect(res.destinationUrl).toBeNull();
      }
    });

    it('deve validar protocolos com isAllowedProtocol estritamente', () => {
      expect(isAllowedProtocol('https:')).toBe(true);
      expect(isAllowedProtocol('http:')).toBe(true);
      expect(isAllowedProtocol('ftp:')).toBe(false);
      expect(isAllowedProtocol('file:')).toBe(false);
      expect(isAllowedProtocol('javascript:')).toBe(false);
    });
  });

  describe('9 & 10. Validação no Background e navegação na aba atual sem criar nova aba', () => {
    it('deve processar mensagem NAVIGATE_TAB no Background e chamar tabs.update na mesma aba', async () => {
      setupImmersiveModeManager();
      const bgListener = messageListeners[0];
      expect(bgListener).toBeDefined();

      const sender = {
        tab: {
          id: 101,
          url: 'https://example.com/page',
          windowId: 1,
        },
      };

      const sendResponse = vi.fn();
      const handled = bgListener(
        { action: MESSAGE_ACTIONS.NAVIGATE_TAB, query: 'github.com' },
        sender,
        sendResponse
      );

      expect(handled).toBe(true);
      await Promise.resolve();
      await vi.runAllTimersAsync();

      expect(chrome.tabs.update).toHaveBeenCalledWith(101, {
        url: 'https://github.com/',
      });
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          destinationUrl: 'https://github.com/',
        })
      );
    });

    it('deve rejeitar requisição de navegação se a aba de origem estiver em página restrita', async () => {
      setupImmersiveModeManager();
      const bgListener = messageListeners[0];

      const sender = {
        tab: {
          id: 101,
          url: 'chrome://extensions',
          windowId: 1,
        },
      };

      const sendResponse = vi.fn();
      bgListener(
        { action: MESSAGE_ACTIONS.NAVIGATE_TAB, query: 'https://example.com' },
        sender,
        sendResponse
      );

      await Promise.resolve();
      await vi.runAllTimersAsync();

      expect(chrome.tabs.update).not.toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Navegação não permitida'),
        })
      );
    });
  });

  describe('11. Tratamento de falha de comunicação', () => {
    it('deve exibir status de erro caso o Background reporte falha de navegação', () => {
      const dummyShadow = document.createElement('div');
      const controller = globalThis.renderOkamiHUDInShadow(dummyShadow, { isImmersive: true });
      const addressBar = dummyShadow.querySelector(`#${OKAMI_HUD_ADDRESS_BAR_ID}`);

      controller.setAddressStatus('error', 'Falha ao conectar');
      expect(addressBar.classList.contains('status-error')).toBe(true);

      const toast = dummyShadow.querySelector('#okami-hud-toast-feedback');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('Falha ao conectar');
    });

    it('deve definir status loading ao iniciar navegação', () => {
      const dummyShadow = document.createElement('div');
      const controller = globalThis.renderOkamiHUDInShadow(dummyShadow, { isImmersive: true });
      const addressBar = dummyShadow.querySelector(`#${OKAMI_HUD_ADDRESS_BAR_ID}`);

      controller.setAddressStatus('loading');
      expect(addressBar.classList.contains('status-loading')).toBe(true);
    });
  });

  describe('12 & 13. Atualização do endereço e sincronização SPA', () => {
    it('deve sincronizar o valor do campo com o endereço atual da aba sem recriar o HUD', () => {
      globalThis.registerOkamiHUDRoot();
      const element = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);
      document.body.appendChild(element);

      element.setAddressValue('https://example.com/initial');
      expect(element.getAddressValue()).toBe('https://example.com/initial');

      // Atualiza para nova URL (ex: redirecionamento ou navegação)
      element.setAddressValue('https://example.com/subpage');
      expect(element.getAddressValue()).toBe('https://example.com/subpage');
    });

    it('deve sincronizar endereço ao ocorrer eventos de popstate e pushState de SPA', () => {
      globalThis.injectOkamiHUD();
      const controller = globalThis.getActiveController();

      // Altera URL via pushState
      window.history.pushState({}, '', '/spa-route');
      expect(controller.getAddressValue()).toContain('/spa-route');
    });
  });

  describe('14. Preservação do funcionamento do HUD e do botão Sair', () => {
    it('deve manter o botão Sair funcional após a introdução da barra de endereço', () => {
      const exitSpy = vi.fn();
      globalThis.requestExitImmersiveMode = exitSpy;

      const dummyShadow = document.createElement('div');
      globalThis.renderOkamiHUDInShadow(dummyShadow, { isImmersive: true });

      const exitButton = dummyShadow.querySelector(`#${OKAMI_HUD_EXIT_BUTTON_ID}`);
      expect(exitButton).not.toBeNull();

      exitButton.click();
      expect(exitSpy).toHaveBeenCalledTimes(1);
    });

    it('deve permitir limpar o campo através do botão limpar', () => {
      const dummyShadow = document.createElement('div');
      const controller = globalThis.renderOkamiHUDInShadow(dummyShadow, { isImmersive: true });
      const input = dummyShadow.querySelector(`#${OKAMI_HUD_ADDRESS_INPUT_ID}`);
      const clearBtn = dummyShadow.querySelector('#okami-hud-address-clear');

      controller.setAddressValue('https://example.com');
      expect(input.value).toBe('https://example.com');

      clearBtn.click();
      expect(input.value).toBe('');
    });
  });
});
