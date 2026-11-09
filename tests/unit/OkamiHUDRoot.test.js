import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../src/content/components/OkamiHUDRoot.js';
import {
  OKAMI_HUD_CUSTOM_ELEMENT,
  OKAMI_HUD_EXIT_BUTTON_ID,
} from '../../src/shared/constants/index.js';

describe('OkamiHUDRoot Custom Element', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve registrar o custom element corretamente', () => {
    globalThis.registerOkamiHUDRoot();
    expect(customElements.get(OKAMI_HUD_CUSTOM_ELEMENT)).toBeDefined();
  });

  it('deve renderizar o indicador do Okami HUD dentro do Shadow DOM fechado', () => {
    globalThis.registerOkamiHUDRoot();
    const element = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);
    document.body.appendChild(element);

    expect(element.hasRenderedBadge()).toBe(true);
  });

  it('não deve vazar estilos ou elementos diretamente no light DOM do hospedeiro', () => {
    globalThis.registerOkamiHUDRoot();
    const element = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);
    document.body.appendChild(element);

    // No light DOM não deve haver filhos diretos gerados
    expect(element.children.length).toBe(0);
  });

  it('deve retornar false e não lançar exceção se customElements for null ou indefinido', () => {
    const originalCustomElements = globalThis.customElements;

    globalThis.customElements = null;
    expect(globalThis.registerOkamiHUDRoot()).toBe(false);

    globalThis.customElements = undefined;
    expect(globalThis.registerOkamiHUDRoot()).toBe(false);

    globalThis.customElements = originalCustomElements;
  });

  it('deve exibir e ocultar o botão de saída ao alterar o estado imersivo', () => {
    globalThis.registerOkamiHUDRoot();
    const element = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);
    document.body.appendChild(element);

    expect(element.hasExitButton()).toBe(false);

    element.setImmersiveState(true);
    expect(element.hasExitButton()).toBe(true);

    // Não deve duplicar se chamado novamente
    element.setImmersiveState(true);
    expect(element.hasExitButton()).toBe(true);

    element.setImmersiveState(false);
    expect(element.hasExitButton()).toBe(false);
  });

  it('deve acionar requestExitImmersiveMode ao clicar no botão de saída no Shadow DOM', () => {
    const exitSpy = vi.fn();
    globalThis.requestExitImmersiveMode = exitSpy;

    const dummyShadow = document.createElement('div');
    globalThis.updateExitButtonInShadow(dummyShadow, true);

    const button = dummyShadow.querySelector(`#${OKAMI_HUD_EXIT_BUTTON_ID}`);
    expect(button).not.toBeNull();

    button.click();
    expect(exitSpy).toHaveBeenCalled();
  });
});
