import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStorageArea,
  getAllWindowState,
  setAllWindowState,
  getWindowState,
  removeWindowState,
  notifyTab,
  broadcastWindowImmersiveState,
  enterImmersiveMode,
  exitImmersiveMode,
  toggleImmersiveMode,
  setupImmersiveModeManager,
} from '../../src/background/managers/ImmersiveModeManager.js';
import {
  COMMAND_TOGGLE_IMMERSIVE,
  MESSAGE_ACTIONS,
} from '../../src/shared/constants/index.js';

describe('ImmersiveModeManager', () => {
  let mockStorageStore = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    mockStorageStore = {};

    globalThis.chrome = {
      storage: {
        session: {
          get: vi.fn(async (key) => {
            if (typeof key === 'string') {
              return { [key]: mockStorageStore[key] };
            }
            return mockStorageStore;
          }),
          set: vi.fn(async (items) => {
            Object.assign(mockStorageStore, items);
          }),
        },
      },
      windows: {
        get: vi.fn(),
        getCurrent: vi.fn(),
        update: vi.fn(),
        onBoundsChanged: { addListener: vi.fn() },
        onRemoved: { addListener: vi.fn() },
      },
      tabs: {
        query: vi.fn(),
        sendMessage: vi.fn(),
        onActivated: { addListener: vi.fn() },
      },
      action: {
        onClicked: { addListener: vi.fn() },
      },
      commands: {
        onCommand: { addListener: vi.fn() },
      },
      runtime: {
        onMessage: { addListener: vi.fn() },
      },
    };
  });

  describe('Storage handling', () => {
    it('deve utilizar chrome.storage.session prioritariamente e fallback para local', () => {
      expect(getStorageArea()).toBe(globalThis.chrome.storage.session);

      delete globalThis.chrome.storage.session;
      globalThis.chrome.storage.local = { get: vi.fn(), set: vi.fn() };
      expect(getStorageArea()).toBe(globalThis.chrome.storage.local);

      globalThis.chrome.storage = undefined;
      expect(getStorageArea()).toBeNull();
    });

    it('deve obter e salvar o estado das janelas com segurança', async () => {
      expect(await getAllWindowState()).toEqual({});

      await setAllWindowState({ 123: { isImmersive: true, previousState: 'normal' } });
      expect(await getAllWindowState()).toEqual({
        123: { isImmersive: true, previousState: 'normal' },
      });

      const winState = await getWindowState(123);
      expect(winState).toEqual({ isImmersive: true, previousState: 'normal' });

      const missingState = await getWindowState(999);
      expect(missingState).toEqual({ isImmersive: false, previousState: 'normal' });

      await removeWindowState(123);
      expect(await getAllWindowState()).toEqual({});
    });
  });

  describe('Comunicação e notificação de abas', () => {
    it('deve notificar aba com a ação correta', async () => {
      await notifyTab(45, true);
      expect(globalThis.chrome.tabs.sendMessage).toHaveBeenCalledWith(45, {
        action: MESSAGE_ACTIONS.IMMERSIVE_STATE_CHANGED,
        isImmersive: true,
      });
    });

    it('deve tratar silenciosamente falha de comunicação ao notificar aba protegida', async () => {
      globalThis.chrome.tabs.sendMessage.mockRejectedValueOnce(
        new Error('Could not establish connection. Receiving end does not exist.')
      );

      await expect(notifyTab(99, true)).resolves.not.toThrow();
    });

    it('deve propagar o estado para todas as abas da janela', async () => {
      globalThis.chrome.tabs.query.mockResolvedValue([
        { id: 101, windowId: 1 },
        { id: 102, windowId: 1 },
      ]);

      await broadcastWindowImmersiveState(1, true);

      expect(globalThis.chrome.tabs.query).toHaveBeenCalledWith({ windowId: 1 });
      expect(globalThis.chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
      expect(globalThis.chrome.tabs.sendMessage).toHaveBeenCalledWith(101, {
        action: MESSAGE_ACTIONS.IMMERSIVE_STATE_CHANGED,
        isImmersive: true,
      });
      expect(globalThis.chrome.tabs.sendMessage).toHaveBeenCalledWith(102, {
        action: MESSAGE_ACTIONS.IMMERSIVE_STATE_CHANGED,
        isImmersive: true,
      });
    });
  });

  describe('Entrada, Saída e Alternância (Toggle)', () => {
    it('deve entrar no modo imersivo preservando o estado anterior', async () => {
      globalThis.chrome.windows.get.mockResolvedValue({ id: 1, state: 'maximized' });
      globalThis.chrome.windows.update.mockResolvedValue({ id: 1, state: 'fullscreen' });
      globalThis.chrome.tabs.query.mockResolvedValue([]);

      const result = await enterImmersiveMode(1);
      expect(result).toBe(true);

      expect(globalThis.chrome.windows.update).toHaveBeenCalledWith(1, { state: 'fullscreen' });

      const state = await getWindowState(1);
      expect(state.isImmersive).toBe(true);
      expect(state.previousState).toBe('maximized');
    });

    it('não deve declarar sucesso se a API de fullscreen falhar', async () => {
      globalThis.chrome.windows.get.mockResolvedValue({ id: 1, state: 'normal' });
      globalThis.chrome.windows.update.mockResolvedValue({ id: 1, state: 'normal' }); // Não mudou

      const result = await enterImmersiveMode(1);
      expect(result).toBe(false);

      const state = await getWindowState(1);
      expect(state.isImmersive).toBe(false);
    });

    it('deve sair do modo imersivo e restaurar o estado original da janela', async () => {
      await setAllWindowState({
        1: { isImmersive: true, previousState: 'maximized' },
      });

      globalThis.chrome.windows.get.mockResolvedValue({ id: 1, state: 'fullscreen' });
      globalThis.chrome.windows.update.mockResolvedValue({ id: 1, state: 'maximized' });
      globalThis.chrome.tabs.query.mockResolvedValue([]);

      const result = await exitImmersiveMode(1);
      expect(result).toBe(true);
      expect(globalThis.chrome.windows.update).toHaveBeenCalledWith(1, { state: 'maximized' });

      const state = await getWindowState(1);
      expect(state.isImmersive).toBe(false);
      expect(state.previousState).toBe('maximized');
    });

    it('deve alternar entre ativado e desativado com toggleImmersiveMode', async () => {
      globalThis.chrome.windows.get.mockResolvedValue({ id: 1, state: 'normal' });
      globalThis.chrome.windows.update.mockResolvedValue({ id: 1, state: 'fullscreen' });
      globalThis.chrome.tabs.query.mockResolvedValue([]);

      // 1ª chamada: Ativa
      let success = await toggleImmersiveMode(1);
      expect(success).toBe(true);
      let state = await getWindowState(1);
      expect(state.isImmersive).toBe(true);

      // 2ª chamada: Desativa
      globalThis.chrome.windows.get.mockResolvedValue({ id: 1, state: 'fullscreen' });
      globalThis.chrome.windows.update.mockResolvedValue({ id: 1, state: 'normal' });

      success = await toggleImmersiveMode(1);
      expect(success).toBe(true);
      state = await getWindowState(1);
      expect(state.isImmersive).toBe(false);
    });
  });

  describe('Listeners e integração de eventos', () => {
    it('deve configurar listeners para action, commands, messages, bounds, removed e tabs', () => {
      setupImmersiveModeManager();

      expect(globalThis.chrome.action.onClicked.addListener).toHaveBeenCalled();
      expect(globalThis.chrome.commands.onCommand.addListener).toHaveBeenCalled();
      expect(globalThis.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
      expect(globalThis.chrome.windows.onBoundsChanged.addListener).toHaveBeenCalled();
      expect(globalThis.chrome.windows.onRemoved.addListener).toHaveBeenCalled();
      expect(globalThis.chrome.tabs.onActivated.addListener).toHaveBeenCalled();
    });

    it('deve acionar toggle ao clicar no ícone da extensão', async () => {
      setupImmersiveModeManager();
      const actionListener = globalThis.chrome.action.onClicked.addListener.mock.calls[0][0];

      globalThis.chrome.windows.get.mockResolvedValue({ id: 5, state: 'normal' });
      globalThis.chrome.windows.update.mockResolvedValue({ id: 5, state: 'fullscreen' });
      globalThis.chrome.tabs.query.mockResolvedValue([]);

      await actionListener({ windowId: 5 });

      expect(globalThis.chrome.windows.update).toHaveBeenCalledWith(5, { state: 'fullscreen' });
    });

    it('deve acionar toggle através do comando de teclado configurado', async () => {
      setupImmersiveModeManager();
      const commandListener = globalThis.chrome.commands.onCommand.addListener.mock.calls[0][0];

      globalThis.chrome.windows.getCurrent.mockResolvedValue({ id: 8 });
      globalThis.chrome.windows.get.mockResolvedValue({ id: 8, state: 'normal' });
      globalThis.chrome.windows.update.mockResolvedValue({ id: 8, state: 'fullscreen' });
      globalThis.chrome.tabs.query.mockResolvedValue([]);

      await commandListener(COMMAND_TOGGLE_IMMERSIVE);

      expect(globalThis.chrome.windows.update).toHaveBeenCalledWith(8, { state: 'fullscreen' });
    });

    it('deve recuperar inconsistência quando a janela sai de fullscreen externamente (ex: F11/Esc)', async () => {
      setupImmersiveModeManager();
      const boundsListener = globalThis.chrome.windows.onBoundsChanged.addListener.mock.calls[0][0];

      await setAllWindowState({
        7: { isImmersive: true, previousState: 'normal' },
      });
      globalThis.chrome.tabs.query.mockResolvedValue([]);

      // Janela disparou onBoundsChanged com state 'normal'
      await boundsListener({ id: 7, state: 'normal' });

      const state = await getWindowState(7);
      expect(state.isImmersive).toBe(false);
      expect(globalThis.chrome.tabs.query).toHaveBeenCalledWith({ windowId: 7 });
    });

    it('deve limpar dados da janela quando chrome.windows.onRemoved for disparado', async () => {
      setupImmersiveModeManager();
      const removedListener = globalThis.chrome.windows.onRemoved.addListener.mock.calls[0][0];

      await setAllWindowState({
        10: { isImmersive: true, previousState: 'normal' },
      });

      await removedListener(10);
      const state = await getWindowState(10);
      expect(state.isImmersive).toBe(false);
    });

    it('deve sincronizar com a aba quando trocada (chrome.tabs.onActivated)', async () => {
      setupImmersiveModeManager();
      const activatedListener = globalThis.chrome.tabs.onActivated.addListener.mock.calls[0][0];

      await setAllWindowState({
        2: { isImmersive: true, previousState: 'normal' },
      });

      await activatedListener({ tabId: 202, windowId: 2 });
      expect(globalThis.chrome.tabs.sendMessage).toHaveBeenCalledWith(202, {
        action: MESSAGE_ACTIONS.IMMERSIVE_STATE_CHANGED,
        isImmersive: true,
      });
    });

    it('deve responder mensagens assíncronas do runtime (GET_IMMERSIVE_STATE e EXIT_IMMERSIVE)', async () => {
      setupImmersiveModeManager();
      const messageListener = globalThis.chrome.runtime.onMessage.addListener.mock.calls[0][0];

      await setAllWindowState({
        3: { isImmersive: true, previousState: 'normal' },
      });

      const sendResponseGet = vi.fn();
      const isAsyncGet = messageListener(
        { action: MESSAGE_ACTIONS.GET_IMMERSIVE_STATE },
        { tab: { windowId: 3 } },
        sendResponseGet
      );
      expect(isAsyncGet).toBe(true);

      // Espera tick
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(sendResponseGet).toHaveBeenCalledWith({ isImmersive: true });

      // Teste do EXIT_IMMERSIVE
      globalThis.chrome.windows.get.mockResolvedValue({ id: 3, state: 'fullscreen' });
      globalThis.chrome.windows.update.mockResolvedValue({ id: 3, state: 'normal' });
      globalThis.chrome.tabs.query.mockResolvedValue([]);

      const sendResponseExit = vi.fn();
      const isAsyncExit = messageListener(
        { action: MESSAGE_ACTIONS.EXIT_IMMERSIVE },
        { tab: { windowId: 3 } },
        sendResponseExit
      );
      expect(isAsyncExit).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(sendResponseExit).toHaveBeenCalledWith({ success: true });
    });
  });
});
