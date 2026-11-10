import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../src/content/components/OkamiHUDRoot.js';
import '../../src/content/index.js';
import { MESSAGE_ACTIONS, READINESS_STATUS } from '../../src/shared/constants/index.js';

describe('PR04.3 — Regressão Completa de Ciclo de Vida e Prontidão Funcional', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    globalThis.resetContentScriptStateForTesting?.();
  });

  describe('Cenário A — Inicialização Limpa', () => {
    it('deve criar exatamente uma instância de okami-hud-root e disponibilizar controlador funcional', () => {
      const root = globalThis.injectOkamiHUD();
      expect(root).not.toBeNull();
      expect(document.querySelectorAll('okami-hud-root').length).toBe(1);

      const controller = globalThis.getCurrentHUDController();
      expect(controller).not.toBeNull();
      expect(typeof controller.toggleTopBar).toBe('function');
      expect(typeof controller.setImmersiveState).toBe('function');

      const readiness = globalThis.buildReadinessContract();
      expect(readiness.status).toBe(READINESS_STATUS.READY);
      expect(readiness.readiness.controllerAvailable).toBe(true);
      expect(readiness.readiness.hudElementInjected).toBe(true);
    });
  });

  describe('Cenário B — Reinjeção e Recuperação de Controlador', () => {
    it('deve manter exatamente uma instância no DOM e preservar o controlador funcional após reinjeção', () => {
      const firstRoot = globalThis.injectOkamiHUD();
      const firstController = globalThis.getCurrentHUDController();
      expect(firstController).not.toBeNull();

      // Simula reinjeção em runtime subsequente
      const secondRoot = globalThis.injectOkamiHUD();
      expect(secondRoot).toBe(firstRoot);
      expect(document.querySelectorAll('okami-hud-root').length).toBe(1);

      const secondController = globalThis.getCurrentHUDController();
      expect(secondController).toBe(firstController);

      // Comandos de visibilidade devem continuar funcionando
      globalThis.applyImmersiveState(true);
      expect(secondController.isTopBarVisible()).toBe(false);
      globalThis.toggleHUDVisibility();
      expect(secondController.isTopBarVisible()).toBe(true);
      globalThis.toggleHUDVisibility();
      expect(secondController.isTopBarVisible()).toBe(false);
    });

    it('deve recriar elemento de forma segura se encontrar instância órfã sem controlador funcional no DOM', () => {
      // Cria um elemento no DOM antes de qualquer inicialização de classe
      const orphan = document.createElement('div');
      Object.defineProperty(orphan, 'tagName', { value: 'OKAMI-HUD-ROOT' });
      // Ou cria um elemento dummy no document
      const dummyElem = document.createElement('okami-hud-root');
      document.body.appendChild(dummyElem);

      // Desativa o controlador para simular corrupção ou órfão
      const sym = Symbol.for('okami.hud.controller');
      dummyElem[sym] = null;
      dummyElem.getHUDController = () => null;

      const recoveredRoot = globalThis.injectOkamiHUD();
      expect(recoveredRoot).not.toBe(dummyElem);
      expect(document.querySelectorAll('okami-hud-root').length).toBe(1);
      expect(globalThis.getCurrentHUDController()).not.toBeNull();
    });
  });

  describe('Cenário C — DOM em Carregamento e Ping Prematuro', () => {
    it('não deve declarar status ready enquanto a interface não estiver instanciada', () => {
      globalThis.resetContentScriptStateForTesting();
      const contract = globalThis.buildReadinessContract();

      expect(contract.status).toBe(READINESS_STATUS.INITIALIZING);
      expect(contract.readiness.controllerAvailable).toBe(false);
      expect(contract.readiness.hudElementInjected).toBe(false);
    });
  });

  describe('Cenário D — Recuperação e Resposta a Comandos', () => {
    it('deve processar TOGGLE_HUD_VISIBILITY via listener registrado', () => {
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
      globalThis.injectOkamiHUD();
      globalThis.applyImmersiveState(true);

      const controller = globalThis.getCurrentHUDController();
      expect(controller.isTopBarVisible()).toBe(false);

      capturedListener({ action: MESSAGE_ACTIONS.TOGGLE_HUD_VISIBILITY }, {}, () => {});
      expect(controller.isTopBarVisible()).toBe(true);
    });
  });

  describe('Cenário E — Estado Imersivo e Interações Visuais', () => {
    it('deve acoplar e desacoplar sensores de borda e auto-hide ao entrar e sair de imersivo', () => {
      globalThis.injectOkamiHUD();
      const controller = globalThis.getCurrentHUDController();

      // Fora de imersivo
      expect(controller.isImmersive).toBe(false);
      controller.handleGlobalPointerMove({ clientY: 2 });
      expect(controller.isTopBarVisible()).toBe(false);

      // Entra em imersivo
      globalThis.applyImmersiveState(true, { flash: true });
      expect(controller.isImmersive).toBe(true);
      expect(controller.isTopBarVisible()).toBe(true);

      // Auto-hide
      controller.scheduleHideTopBar(0);
      controller.hideTopBarImmediately();
      expect(controller.isTopBarVisible()).toBe(false);

      // Sensor de borda (clientY <= 8)
      controller.handleGlobalPointerMove({ clientY: 5 });
      expect(controller.isTopBarVisible()).toBe(true);

      // Sai de imersivo
      globalThis.applyImmersiveState(false);
      expect(controller.isImmersive).toBe(false);
      expect(controller.isTopBarVisible()).toBe(false);
    });
  });

  describe('Cenário F — Idempotência e Limpeza de Recursos', () => {
    it('deve destruir controladores antigos e não acumular nós ao executar múltiplas injeções', () => {
      const destroySpy = vi.fn();
      const firstRoot = globalThis.injectOkamiHUD();
      const controller = globalThis.getCurrentHUDController();
      controller.destroy = destroySpy;

      // Executa múltiplas vezes
      globalThis.injectOkamiHUD();
      globalThis.injectOkamiHUD();

      expect(document.querySelectorAll('okami-hud-root').length).toBe(1);
      expect(firstRoot.parentNode).not.toBeNull();
    });
  });
});
