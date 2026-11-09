import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../src/content/components/OkamiHUDRoot.js';
import {
  OKAMI_HUD_CUSTOM_ELEMENT,
  OKAMI_HUD_EXIT_BUTTON_ID,
  OKAMI_HUD_TOP_BAR_ID,
  OKAMI_HUD_TRIGGER_ZONE_ID,
} from '../../src/shared/constants/index.js';

describe('OkamiHUDRoot Custom Element', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
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
    expect(element.hasTopBar()).toBe(true);
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

  it('deve conter a barra superior oculta inicialmente quando fora do modo imersivo', () => {
    globalThis.registerOkamiHUDRoot();
    const element = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);
    document.body.appendChild(element);

    expect(element.hasTopBar()).toBe(true);
    expect(element.isTopBarVisible()).toBe(false);
    expect(element.hasExitButton()).toBe(false);
  });

  it('deve exibir e ocultar o botão de saída e classes imersivas ao alterar o estado imersivo', () => {
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
    expect(element.isTopBarVisible()).toBe(false);
  });

  it('deve acionar requestExitImmersiveMode ao clicar no botão de saída no Shadow DOM', () => {
    const exitSpy = vi.fn();
    globalThis.requestExitImmersiveMode = exitSpy;

    const dummyShadow = document.createElement('div');
    globalThis.renderOkamiHUDInShadow(dummyShadow, { isImmersive: true });

    const button = dummyShadow.querySelector(`#${OKAMI_HUD_EXIT_BUTTON_ID}`);
    expect(button).not.toBeNull();

    button.click();
    expect(exitSpy).toHaveBeenCalled();
  });

  it('não deve abrir a barra superior ao aproximar o mouse se o modo imersivo estiver desativado', () => {
    globalThis.registerOkamiHUDRoot();
    const element = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);
    document.body.appendChild(element);

    const controller = element.getHUDController();
    expect(controller).toBeDefined();

    // Simula aproximação do cursor pela janela (clientY <= 8)
    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 4 }));
    expect(element.isTopBarVisible()).toBe(false);

    controller.showTopBar();
    expect(element.isTopBarVisible()).toBe(false);
  });

  it('deve abrir a barra superior ao aproximar o cursor da borda superior em modo imersivo', () => {
    globalThis.registerOkamiHUDRoot();
    const element = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);
    document.body.appendChild(element);

    element.setImmersiveState(true);
    expect(element.isTopBarVisible()).toBe(false);

    // Aproxima cursor do topo
    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 5 }));
    expect(element.isTopBarVisible()).toBe(true);
  });

  it('deve manter a barra visível durante interação e fechar com atraso após saída do cursor', () => {
    const dummyShadow = document.createElement('div');
    const controller = globalThis.renderOkamiHUDInShadow(dummyShadow, { isImmersive: true });

    const topBar = dummyShadow.querySelector(`#${OKAMI_HUD_TOP_BAR_ID}`);
    const trigger = dummyShadow.querySelector(`#${OKAMI_HUD_TRIGGER_ZONE_ID}`);

    expect(topBar.classList.contains('visible')).toBe(false);

    // Mouse entra na zona sensora de topo
    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    expect(topBar.classList.contains('visible')).toBe(true);

    // Mouse sai do trigger mas entra na barra
    trigger.dispatchEvent(new MouseEvent('mouseleave'));
    topBar.dispatchEvent(new MouseEvent('mouseenter'));

    // Avança tempo parcial - ainda deve continuar visível
    vi.advanceTimersByTime(200);
    expect(topBar.classList.contains('visible')).toBe(true);

    // Mouse sai da barra
    topBar.dispatchEvent(new MouseEvent('mouseleave'));
    expect(topBar.classList.contains('visible')).toBe(true);

    // Avança além do tempo de atraso (HUD_AUTOHIDE_DELAY_MS = 380ms)
    vi.advanceTimersByTime(400);
    expect(topBar.classList.contains('visible')).toBe(false);

    controller.destroy();
  });

  it('deve ocultar a barra imediatamente ao sair do modo imersivo mesmo se estiver visível', () => {
    globalThis.registerOkamiHUDRoot();
    const element = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT);
    document.body.appendChild(element);

    element.setImmersiveState(true);
    const controller = element.getHUDController();
    controller.showTopBar();
    expect(element.isTopBarVisible()).toBe(true);

    // Sai do modo imersivo
    element.setImmersiveState(false);
    expect(element.isTopBarVisible()).toBe(false);
    expect(element.hasExitButton()).toBe(false);
  });

  it('deve conter as 3 regiões estruturais da barra superior com identidade visual Okami', () => {
    const dummyShadow = document.createElement('div');
    globalThis.renderOkamiHUDInShadow(dummyShadow, { isImmersive: true });

    const topBar = dummyShadow.querySelector(`#${OKAMI_HUD_TOP_BAR_ID}`);
    expect(topBar).not.toBeNull();

    const leftSection = topBar.querySelector('.okami-section-left');
    const centerSection = topBar.querySelector('.okami-section-center');
    const rightSection = topBar.querySelector('.okami-section-right');

    expect(leftSection).not.toBeNull();
    expect(centerSection).not.toBeNull();
    expect(rightSection).not.toBeNull();

    // Identidade visual Okami
    const brandName = leftSection.querySelector('.okami-brand-name');
    expect(brandName.textContent).toBe('OKAMI');

    // Botão de saída integrado na seção direita
    const exitBtn = rightSection.querySelector(`#${OKAMI_HUD_EXIT_BUTTON_ID}`);
    expect(exitBtn).not.toBeNull();
  });
});
